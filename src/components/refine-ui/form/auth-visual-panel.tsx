export function AuthVisualPanel() {
  return (
    <div className="hidden w-full max-w-xl flex-1 lg:block">
      <div className="overflow-hidden rounded-lg border bg-background/80 shadow-xl">
        <picture>
          <source
            srcSet="/assets/generated/fairpay-landing-hero.webp"
            type="image/webp"
          />
          <img
            src="/assets/generated/fairpay-landing-hero.png"
            alt=""
            width={1672}
            height={941}
            className="aspect-[16/9] h-full w-full object-cover"
            decoding="async"
          />
        </picture>
      </div>
    </div>
  );
}
