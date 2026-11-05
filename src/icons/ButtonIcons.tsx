import type { ReactElement, SVGProps } from "react";

// 인라인 SVG (currentColor로 버튼 텍스트 색 상속, @svgr/webpack 불필요)
const ChevronLeftSvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable={false}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.0303 2.46967C17.3232 2.76256 17.3232 3.23744 17.0303 3.53033L8.56066 12L17.0303 20.4697C17.3232 20.7626 17.3232 21.2374 17.0303 21.5303C16.7374 21.8232 16.2626 21.8232 15.9697 21.5303L6.96967 12.5303C6.67678 12.2374 6.67678 11.7626 6.96967 11.4697L15.9697 2.46967C16.2626 2.17678 16.7374 2.17678 17.0303 2.46967Z"
      fill="currentColor"
    />
  </svg>
);

const ChevronRightSvg = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable={false}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.96967 2.46967C6.67678 2.76256 6.67678 3.23744 6.96967 3.53033L15.4393 12L6.96967 20.4697C6.67678 20.7626 6.67678 21.2374 6.96967 21.5303C7.26256 21.8232 7.73744 21.8232 8.03033 21.5303L17.0303 12.5303C17.3232 12.2374 17.3232 11.7626 17.0303 11.4697L8.03033 2.46967C7.73744 2.17678 7.26256 2.17678 6.96967 2.46967Z"
      fill="currentColor"
    />
  </svg>
);

export function ButtonLeadingIcon(
  props: SVGProps<SVGSVGElement>
): ReactElement {
  return <ChevronLeftSvg {...props} />;
}

export function ButtonTrailingIcon(
  props: SVGProps<SVGSVGElement>
): ReactElement {
  return <ChevronRightSvg {...props} />;
}
