import { lazy, Suspense, useEffect, useState } from "react";
import {
  ImagePlus,
  LoaderCircle,
  Minus,
  Plus,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { useDispatch } from "react-redux";
import api from "../lib/api";
import { setUser } from "../redux/userSlice";
import { useScrollLock } from "../hooks/useScrollLock";

const Cropper = lazy(() => import("react-easy-crop"));

const createCroppedImage = (imageSource, cropArea) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Your browser could not crop this image."));
        return;
      }
      context.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height,
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Your browser could not crop this image."));
            return;
          }
          resolve(
            new File([blob], `astra-profile-${Date.now()}.jpg`, {
              type: "image/jpeg",
            }),
          );
        },
        "image/jpeg",
        0.92,
      );
    };
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = imageSource;
  });

const ProfileEditor = ({ user }) => {
  const dispatch = useDispatch();
  const [name, setName] = useState(user.name || "");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(user.profileImage || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // The cropper covers the screen, so the page behind it must not scroll.
  useScrollLock(Boolean(cropSource));
  const [croppedArea, setCroppedArea] = useState(null);
  const [cropPending, setCropPending] = useState(false);

  useEffect(() => {
    if (!preview.startsWith("blob:")) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!cropSource) return undefined;
    return () => URL.revokeObjectURL(cropSource);
  }, [cropSource]);

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setSaved(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setCropSource(URL.createObjectURL(file));
    event.target.value = "";
  };

  const applyCrop = async () => {
    if (!cropSource || !croppedArea) return;
    setCropPending(true);
    setError("");
    try {
      const croppedPhoto = await createCroppedImage(cropSource, croppedArea);
      setPhoto(croppedPhoto);
      setPreview(URL.createObjectURL(croppedPhoto));
      setCropSource("");
      setSaved(false);
    } catch (cropError) {
      setError(cropError.message || "Could not crop this image.");
    } finally {
      setCropPending(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", user.email);
      if (photo) formData.append("file", photo);
      const { data } = await api.put(
        `/api/auth/update-user/${user._id}`,
        formData,
      );
      if (!data.success || !data.user)
        throw new Error(data.message || "Could not update your profile.");
      dispatch(setUser(data.user));
      setPhoto(null);
      setPreview(data.user.profileImage || "");
      setSaved(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Could not update your profile.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={saveProfile}
      className="mt-8 border-t border-neutral-200 pt-7"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-neutral-100 text-neutral-500">
          {preview ? (
            <img
              src={preview}
              alt="Profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound size={25} aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-950">
            Profile photo
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            JPG, PNG, or WebP · up to 5 MB
          </p>
          <label
            htmlFor="profile-photo"
            className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-700 underline underline-offset-4 hover:text-amber-800"
          >
            <ImagePlus size={14} aria-hidden="true" /> Choose photo
          </label>
          <input
            id="profile-photo"
            type="file"
            accept="image/*"
            onChange={selectPhoto}
            className="sr-only"
          />
        </div>
      </div>

      <label className="mt-6 block text-sm font-medium text-neutral-800">
        Full name
        <input
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          className="mt-2 h-12 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950"
        />
      </label>
      <p className="mt-4 text-xs text-neutral-500">
        Email address · {user.email}
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-4 text-sm text-emerald-800">
          Your profile has been updated.
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Save size={16} aria-hidden="true" />
        )}
        Save profile
      </button>

      {cropSource && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-crop-title"
          className="fixed inset-0 z-100 flex items-center justify-center bg-neutral-950/70 p-3 sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCropSource("");
          }}
        >
          <section className="w-full max-w-xl overflow-hidden border border-neutral-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="profile-crop-title"
                  className="text-base font-semibold text-neutral-950"
                >
                  Crop profile photo
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Drag to reposition, then adjust the zoom.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cancel crop"
                onClick={() => setCropSource("")}
                className="inline-flex size-9 items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="relative h-[min(62vh,440px)] bg-neutral-950">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-white/70">
                    Preparing image editor…
                  </div>
                }
              >
                <Cropper
                  image={cropSource}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
                />
              </Suspense>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((value) => Math.max(1, value - 0.1))}
                  className="inline-flex size-9 shrink-0 items-center justify-center border border-neutral-300 text-neutral-700 hover:border-neutral-950 disabled:opacity-40"
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <input
                  aria-label="Photo zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-amber-700"
                />
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom >= 3}
                  onClick={() => setZoom((value) => Math.min(3, value + 0.1))}
                  className="inline-flex size-9 shrink-0 items-center justify-center border border-neutral-300 text-neutral-700 hover:border-neutral-950 disabled:opacity-40"
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCropSource("")}
                  className="min-h-10 border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:border-neutral-950"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!croppedArea || cropPending}
                  onClick={applyCrop}
                  className="inline-flex min-h-10 items-center justify-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {cropPending && (
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  Use photo
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </form>
  );
};

export default ProfileEditor;
