import { getCategoryDisplayIcon, getCategoryFallbackMeta } from "@/lib/categoryIcons";

export function CategoryIcon({
  name,
  iconUrl,
  size = "md",
}: {
  /** English category name — used for fallback icon/bg lookup (not the translated label). */
  name: string;
  iconUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const fallback = getCategoryFallbackMeta(name);
  const remote = getCategoryDisplayIcon(iconUrl);
  const sizeClasses = {
    sm: { wrap: "w-8 h-8", img: "w-5 h-5" },
    md: { wrap: "w-9 h-9", img: "w-7 h-7" },
    lg: { wrap: "w-10 h-10", img: "w-7 h-7" },
  }[size];

  return (
    <div
      className={`${sizeClasses.wrap} rounded-full ${fallback.bg} flex items-center justify-center flex-shrink-0 overflow-hidden`}
    >
      {remote ? (
        <img 
          src={remote} 
          alt="" 
          className={`${sizeClasses.img} object-contain`} 
          onError={(e) => {
            e.currentTarget.src = fallback.icon;
            e.currentTarget.className = `${sizeClasses.img} object-contain`;
          }}
        />
      ) : (
        <img
          src={fallback.icon}
          alt=""
          className={`${sizeClasses.img} object-contain`}
        />
      )}
    </div>
  );
}
