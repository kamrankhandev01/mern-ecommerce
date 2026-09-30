import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import env from "../config/env.js";
import { roundMoney } from "../utils/pricing.js";

/**
 * Analytics for the admin overview.
 *
 * Every figure is derived from the live collections — nothing is cached or
 * hard-coded — and the daily series is densified so charts never show gaps.
 */

const RANGE_DAYS = { "7": 7, "30": 30, "90": 90 };
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayKey = (date) => date.toISOString().slice(0, 10);

const percentChange = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const withDelta = (value, previous) => ({
  value: roundMoney(value),
  previous: roundMoney(previous),
  delta: percentChange(value, previous),
});

export const getAnalyticsReport = async (req, res) => {
  try {
    const days = RANGE_DAYS[String(req.query.range)] ?? 30;
    const today = startOfDay(new Date());
    const rangeStart = new Date(today.getTime() - (days - 1) * DAY_MS);
    const previousStart = new Date(rangeStart.getTime() - days * DAY_MS);

    const [
      dailyOrders,
      previousTotals,
      statusCounts,
      paymentMethods,
      itemTotals,
      newCustomers,
      previousCustomers,
      inventory,
      lowStock,
    ] = await Promise.all([
      // One row per day across the current range.
      orderModel.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
          },
        },
      ]),

      // Matching previous window, for period-over-period comparison.
      orderModel.aggregate([
        { $match: { createdAt: { $gte: previousStart, $lt: rangeStart } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
            units: { $sum: "$items.quantity" },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$revenue" },
            orders: { $sum: "$orders" },
            units: { $sum: "$units" },
          },
        },
      ]),

      orderModel.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      orderModel.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: "$paymentMethod",
            orders: { $sum: 1 },
            revenue: { $sum: "$total" },
            paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
          },
        },
      ]),

      // Per-product totals for the category split and the best-seller table.
      orderModel.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 500 },
      ]),

      userModel.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),

      userModel.countDocuments({ createdAt: { $gte: rangeStart } }),
      userModel.countDocuments({
        createdAt: { $gte: previousStart, $lt: rangeStart },
      }),

      productModel.aggregate([
        {
          $group: {
            _id: null,
            value: { $sum: { $multiply: ["$price", "$stock"] } },
            units: { $sum: "$stock" },
            products: { $sum: 1 },
            outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          },
        },
      ]),

      productModel
        .find({ stock: { $gt: 0, $lte: 5 } })
        .select("name stock category images")
        .sort({ stock: 1 })
        .limit(5)
        .lean(),
    ]);

    // Daily revenue/orders, densified so the chart has no gaps.
    const byDay = new Map(dailyOrders.map((row) => [row._id, row]));
    const series = [];
    for (let index = 0; index < days; index += 1) {
      const date = new Date(rangeStart.getTime() + index * DAY_MS);
      const row = byDay.get(dayKey(date));
      series.push({
        date: dayKey(date),
        revenue: roundMoney(row?.revenue || 0),
        orders: row?.orders || 0,
        paid: row?.paid || 0,
      });
    }

    const currentRevenue = series.reduce((sum, point) => sum + point.revenue, 0);
    const currentOrders = series.reduce((sum, point) => sum + point.orders, 0);
    const previous = previousTotals[0] || { revenue: 0, orders: 0, units: 0 };

    const currentUnits = itemTotals.reduce((sum, row) => sum + row.units, 0);
    const totalUnits = currentUnits || 1;
    const totalRevenue =
      roundMoney(itemTotals.reduce((sum, row) => sum + row.revenue, 0)) || 1;

    // The category split comes from the products the ordered items reference.
    const productIds = itemTotals
      .filter((row) => mongoose.isValidObjectId(String(row._id)))
      .map((row) => row._id);
    const productMeta = await productModel
      .find({ _id: { $in: productIds } })
      .select("category images")
      .lean();
    const metaById = new Map(
      productMeta.map((product) => [
        String(product._id),
        {
          category: product.category || "Uncategorised",
          image: product.images?.find((image) => image.url)?.url || "",
        },
      ]),
    );

    const categoryMap = new Map();
    for (const row of itemTotals) {
      const meta = metaById.get(String(row._id));
      const name = meta?.category || "Uncategorised";
      const entry = categoryMap.get(name) || {
        name,
        revenue: 0,
        units: 0,
        image: meta?.image || "",
      };
      entry.revenue += row.revenue;
      entry.units += row.units;
      categoryMap.set(name, entry);
    }
    const categories = [...categoryMap.values()]
      .map((entry) => ({
        ...entry,
        revenue: roundMoney(entry.revenue),
        share: Math.round((entry.revenue / totalRevenue) * 1000) / 10,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const statusMap = statusCounts.reduce((accumulator, row) => {
      accumulator[row._id] = row.count;
      return accumulator;
    }, {});

    const stock = inventory[0] || {
      value: 0,
      units: 0,
      products: 0,
      outOfStock: 0,
    };

    return res.status(200).json({
      success: true,
      report: {
        range: days,
        rangeStart: dayKey(rangeStart),
        rangeEnd: dayKey(today),
        currency: env.currency,
        kpis: {
          revenue: withDelta(currentRevenue, previous.revenue),
          orders: withDelta(currentOrders, previous.orders),
          averageOrderValue: withDelta(
            currentOrders ? currentRevenue / currentOrders : 0,
            previous.orders ? previous.revenue / previous.orders : 0,
          ),
          unitsSold: {
            value: currentUnits,
            previous: previous.units || 0,
            delta: percentChange(currentUnits, previous.units || 0),
          },
          newCustomers: withDelta(newCustomers[0]?.total || 0, previousCustomers),
        },
        series,
        statusCounts: {
          pending: statusMap.pending || 0,
          processing: statusMap.processing || 0,
          shipped: statusMap.shipped || 0,
          delivered: statusMap.delivered || 0,
          cancelled: statusMap.cancelled || 0,
        },
        paymentMethods: paymentMethods
          .map((row) => ({
            id: row._id,
            orders: row.orders,
            revenue: roundMoney(row.revenue),
            paid: row.paid,
          }))
          .sort((a, b) => b.revenue - a.revenue),
        categories,
        topProducts: itemTotals.slice(0, 6).map((row) => {
          const meta = metaById.get(String(row._id));
          return {
            id: String(row._id),
            name: row.name,
            category: meta?.category || "Uncategorised",
            image: meta?.image || "",
            units: row.units,
            revenue: roundMoney(row.revenue),
            share: Math.round((row.units / totalUnits) * 1000) / 10,
          };
        }),
        inventory: {
          value: roundMoney(stock.value),
          units: stock.units,
          products: stock.products,
          outOfStock: stock.outOfStock,
        },
        lowStock: lowStock.map((product) => ({
          id: String(product._id),
          name: product.name,
          category: product.category,
          stock: product.stock,
          image: product.images?.find((image) => image.url)?.url || "",
        })),
      },
    });
  } catch (error) {
    console.error("Analytics report failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not build the analytics report." });
  }
};

export default getAnalyticsReport;
