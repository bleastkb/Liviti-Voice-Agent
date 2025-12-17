/**
 * MicroActionCard 组件
 * 显示微行动建议的小卡片，支持点击后触发 LLM 回复
 */

import { MicroAction } from '@/types';

interface MicroActionCardProps {
  action: MicroAction;
  onClick?: (action: MicroAction) => void;
}

export default function MicroActionCard({ action, onClick }: MicroActionCardProps) {
  return (
    <div
      onClick={() => onClick?.(action)}
      className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all ${
        onClick
          ? 'cursor-pointer hover:shadow-md hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98]'
          : ''
      }`}
    >
      <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
      <p className="text-sm text-gray-600">{action.description}</p>
      {onClick && (
        <p className="text-xs text-blue-600 mt-2 opacity-70">Click to explore this action →</p>
      )}
    </div>
  );
}

