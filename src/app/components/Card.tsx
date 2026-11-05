import type { ReactNode } from "react";

export { CardOneLineNewRecordButton } from "./CardOneLineNewRecordButton";
export type { CardOneLineNewRecordButtonProps } from "./CardOneLineNewRecordButton";

export type CardVariant = "elevated" | "outlined" | "flat";

export type CardProps = {
  variant?: CardVariant;
  header?: ReactNode;
  media?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const variantClasses: Record<CardVariant, string> = {
  flat: "border border-[color:var(--colorOutlineBase2,#e1e2e4)]",
  outlined: "border border-[color:var(--colorOutlineBase1,#d4d4d8)]",
  elevated:
    "shadow-[0_4px_8px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08)]",
};

export function Card({
  variant = "flat",
  header,
  media,
  children,
  footer,
  className,
}: CardProps) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-xl bg-[color:var(--colorBackgroundBase1Default,#ffffff)]",
        variantClasses[variant],
        className
      )}
    >
      {media && <div className="w-full">{media}</div>}
      {(header || children || footer) && (
        <div className="flex flex-col gap-3 p-4">
          {header && (
            <header className="text-sm font-medium">
              {header}
            </header>
          )}
          {children && (
            <div className="text-sm text-[color:var(--colorElementBase2Default,#5e6068)]">
              {children}
            </div>
          )}
          {footer && (
            <footer className="mt-1 text-xs text-[color:var(--colorElementBase2Default,#5e6068)]">
              {footer}
            </footer>
          )}
        </div>
      )}
    </section>
  );
}

/** Figma card_1line_with icon — MCP: emotion 32×32, select gap 4px, Chevron 20×20 */
export type CardOneLineWithIconProps = {
  /** Label/M 텍스트 */
  label?: string;
  /** emotion 아이콘 슬롯. EmotionIcon 컴포넌트 등 실제 아이콘 리소스 전달 (MCP: 32×32) */
  emotion?: ReactNode | null;
  /** 우측 Chevron 버튼 표시 여부 */
  showButton?: boolean;
  className?: string;
};

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-full w-full"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.96967 2.46967C6.67678 2.76256 6.67678 3.23744 6.96967 3.53033L15.4393 12L6.96967 20.4697C6.67678 20.7626 6.67678 21.2374 6.96967 21.5303C7.26256 21.8232 7.73744 21.8232 8.03033 21.5303L17.0303 12.5303C17.3232 12.2374 17.3232 11.7626 17.0303 11.4697L8.03033 2.46967C7.73744 2.17678 7.26256 2.17678 6.96967 2.46967Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CardOneLineWithIcon({
  label = "기분 고르기",
  emotion = null,
  showButton = true,
  className,
}: CardOneLineWithIconProps) {
  return (
    <div
      className={cx(
        "flex h-[var(--Grid-Height-M,48px)] w-full items-center justify-between rounded-[16px]",
        "bg-[color:var(--colorBackgroundBase1Default,#ffffff)]",
        "pl-[var(--Grid-Padding-L,16px)] pr-[var(--Grid-Padding-S,8px)] py-0",
        className
      )}
      data-name="card_1line_with icon"
    >
      <p
        className="shrink-0 whitespace-nowrap font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase2Default,#5e6068)]"
      >
        {label}
      </p>
      <div
        className="flex shrink-0 items-center gap-[4px]"
        data-name="select"
      >
        {emotion != null && (
          <div
            className="flex size-[32px] shrink-0 items-center justify-center overflow-clip"
            data-name="emotion-slot"
          >
            {emotion}
          </div>
        )}
        {showButton && (
          <span
            className="inline-flex size-[20px] shrink-0 items-center justify-center overflow-clip"
            data-name="Chevron right"
          >
            <ChevronRightIcon />
          </span>
        )}
      </div>
    </div>
  );
}

/** Figma card_1line_hor (D-24 카드) */
export type CardOneLineHorProps = {
  label?: string;
  /**
   * 마감 표시: **숫자만**이면 `D-{숫자}`로 렌더 (예: `"3"` → D-3).
   * `오늘` / `지남` 등은 접두 `D-` 없이 그대로 표시.
   */
  date?: string;
  className?: string;
};

export function CardOneLineHor({
  label = "Label",
  date = "24",
  className,
}: CardOneLineHorProps) {
  return (
    <div
      className={cx(
        "flex w-full items-center justify-between overflow-hidden rounded-[var(--Grid-Radius-L,12px)]",
        "bg-[color:var(--colorElementTertiaryDefault,#ffcf33)]",
        "px-[var(--Grid-Padding-L,16px)] py-[var(--Grid-Gap-M,8px)]",
        "font-[family-name:var(--Typography-font-family)] text-[color:var(--colorElementBase1Default,#35363b)]",
        "not-italic whitespace-nowrap",
        className
      )}
      data-name="card_1line_hor"
    >
      <p className="relative shrink-0 overflow-hidden text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold leading-[1.2] text-ellipsis">
        {label}
      </p>
      <div className="flex shrink-0 items-center gap-[2px] text-[18px] font-semibold leading-[1.6]">
        {/^\d+$/.test(date) ? (
          <>
            <p className="relative shrink-0 overflow-hidden">D-</p>
            <p className="relative shrink-0 overflow-hidden">{date}</p>
          </>
        ) : (
          <p className="relative shrink-0 overflow-hidden">{date}</p>
        )}
      </div>
    </div>
  );
}

