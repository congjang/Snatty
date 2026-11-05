import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { Card, CardOneLineWithIcon, CardOneLineHor } from "../app/components/Card";
import { EmotionIcon } from "../app/components/EmotionIcon";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  subcomponents: { CardOneLineWithIcon, CardOneLineHor },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "기록 카드 계열 컴포넌트입니다. 감정 선택 카드(card_1line_with icon)와 D-day 카드(card_1line_hor)를 Storybook에서 테스트할 수 있습니다.",
      },
    },
  },
};

export default meta;

type OneLineWithIconStory = StoryObj<typeof CardOneLineWithIcon>;
type OneLineHorStory = StoryObj<typeof CardOneLineHor>;

export const OneLineWithIcon: OneLineWithIconStory = {
  args: {
    label: "기분 고르기",
    emotion: <EmotionIcon name="happiness" />,
  },
  render: (args) => (
    <div className="w-[342px]">
      <CardOneLineWithIcon {...args} />
    </div>
  ),
};

export const OneLineHor: OneLineHorStory = {
  args: {
    label: "여행",
    date: "24",
  },
  render: (args) => (
    <div className="w-[342px]">
      <CardOneLineHor {...args} />
    </div>
  ),
};

