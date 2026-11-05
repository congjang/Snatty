import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { List } from "../app/components/List";

const meta: Meta<typeof List> = {
  title: "Components/List",
  component: List,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "ListItem들을 조합해서 만드는 리스트 컴포넌트입니다. variant(labelOnly / labelSwitch / labelCheck / labelRadio 등)와 size(S/M/L)에 따라 높이와 좌우 컨트롤 배치가 달라집니다.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof List>;

export const LabelSwitch: Story = {
  args: {
    items: [
      {
        id: "1",
        variant: "labelSwitch",
        size: "L",
        label: "오늘의 회고",
        checked: true,
      },
      {
        id: "2",
        variant: "labelSwitch",
        size: "L",
        label: "내일의 목표",
        checked: false,
      },
    ],
  },
};

