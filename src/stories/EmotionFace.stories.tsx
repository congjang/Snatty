import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { EmotionArea } from "../app/components/EmotionArea";
import { EmotionFace } from "../app/components/EmotionFace";
import { EmotionFaceGallery } from "../app/components/EmotionFaceGallery";

const meta: Meta<typeof EmotionFace> = {
  title: "Components/EmotionFace",
  component: EmotionFace,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "얼굴·눈·눈썹·코·입·덧그림 부품을 24×24 한 칸 안에서 조합해 감정 얼굴을 바로 벡터로 그립니다. value에는 저장된 감정 id(예: f1e1b0n0m1x0)나 옛 아이콘 이름(happiness 등)을 넣습니다.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof EmotionFace>;

export const Default: Story = {
  args: { value: "f1e1b0n0m1x0", size: 48 },
};

export const Angry: Story = {
  args: { value: "f3e2b0n0m7x4", size: 48 },
};

export const Gallery: Story = {
  render: () => (
    <div className="w-[640px]">
      <EmotionFaceGallery />
    </div>
  ),
};

export const Area: Story = {
  render: () => (
    <div className="w-[326px]">
      <EmotionArea emotion="f1e1b0n0m1x0" onChange={() => {}} />
    </div>
  ),
};

export const AreaEmpty: Story = {
  render: () => (
    <div className="w-[326px]">
      <EmotionArea emotion={null} onChange={() => {}} />
    </div>
  ),
};
