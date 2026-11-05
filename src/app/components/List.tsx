"use client";

import type { ListItemProps } from "./ListItem";
import { ListItem } from "./ListItem";

/**
 * List — Item 단위가 조합된 컨테이너.
 * Figma: List1Line(Item)을 여러 개 나열한 리스트.
 */
export type ListItemConfig = ListItemProps & { id: string };

export type ListProps = {
  /** Item 설정 배열 (id 필수). 각 항목이 ListItem으로 렌더됨 */
  items: ListItemConfig[];
  /** 활성(선택) 항목 id (시각 강조용, 선택적) */
  activeId?: string;
  /** 항목 클릭 시 콜백 */
  onChange?: (id: string) => void;
  className?: string;
};

export function List({ items, activeId, onChange, className }: ListProps) {
  return (
    <div className={className} data-name="list" role="list">
      {items.map(({ id, ...itemProps }) => (
        <div key={id} role="listitem">
          <ListItem
            {...itemProps}
            active={activeId === id}
            onClick={onChange ? () => onChange(id) : itemProps.onClick}
          />
        </div>
      ))}
    </div>
  );
}
