"use client";

import type { ComponentProps } from "react";
import {
  CardOneLineHor,
  CardOneLineWithIcon,
  CardOneLineNewRecordButton,
} from "./Card";

/** Figma `Card1Line` (node 3232:3094) — 한 줄 카드 세 variant */
export type CardOneLineType =
  | "card_1line_hor"
  | "card_1line_with icon"
  | "card with button";

export type CardOneLineProps =
  | ({ type: "card_1line_hor" } & ComponentProps<typeof CardOneLineHor>)
  | ({ type: "card_1line_with icon" } & ComponentProps<typeof CardOneLineWithIcon>)
  | ({ type: "card with button" } & ComponentProps<
      typeof CardOneLineNewRecordButton
    >);

export function CardOneLine(props: CardOneLineProps) {
  switch (props.type) {
    case "card_1line_hor": {
      const { type: _t, ...rest } = props;
      return <CardOneLineHor {...rest} />;
    }
    case "card_1line_with icon": {
      const { type: _t, ...rest } = props;
      return <CardOneLineWithIcon {...rest} />;
    }
    case "card with button": {
      const { type: _t, ...rest } = props;
      return <CardOneLineNewRecordButton {...rest} />;
    }
  }
}
