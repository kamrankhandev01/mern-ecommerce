import { lazy, Suspense } from "react";

import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import CartSync from "./components/CartSync";
import WishlistSync from "./components/WishlistSync";
import ApiStatusBanner from "./components/ApiStatusBanner";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Account from "./pages/Account";
import Collection from "./pages/Collection";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import Navbar from "./components/Navbar";

const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PageLoading = () => (
  <main className="flex min-h-[60vh] items-center justify-center text-sm text-neutral-500">
    Loading…
  </main>
);

const withLoading = (Component) => (
  <Suspense fallback={<PageLoading />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    element: (
      <>
        <Navbar />
        <Outlet />
        <Footer />
      </>
    ),
    children: [
      { path: "/", element: <Home /> },
      { path: "/collection", element: <Collection /> },
      { path: "/checkout", element: withLoading(Checkout) },
      { path: "/orders", element: withLoading(Orders) },
      { path: "/wishlist", element: withLoading(Wishlist) },
      { path: "/orders/:orderId", element: withLoading(Orders) },
      { path: "/payment-result", element: withLoading(PaymentResult) },
      { path: "/admin", element: withLoading(AdminDashboard) },
      {
        path: "/product/:productId",
        element: (
          <Suspense
            fallback={
              <main className="flex min-h-[65vh] items-center justify-center text-sm text-neutral-500">
                Loading product details
              </main>
            }
          >
            <ProductDetail />
          </Suspense>
        ),
      },
      { path: "/contact", element: <Contact /> },
      { path: "/about", element: <About /> },
      { path: "/account", element: <Account /> },
      { path: "/verify-email", element: <VerifyEmail /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "*", element: withLoading(NotFound) },
    ],
  },
]);

const App = () => {
  return (
    <div>
      {/* Keeps the signed-in account cart and the guest cart in step. */}
      <CartSync />
      {/* Same bridging for the wishlist, so saved items survive sign-in. */}
      <WishlistSync />
      {/* The one app-wide notice. A banner, never a floating toast. */}
      <ApiStatusBanner />
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
