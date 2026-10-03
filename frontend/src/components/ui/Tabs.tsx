import React from 'react';
import AppIcon from './AppIcon';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: TabsProps<T>) {
  return (
    <div
      className={`inline-flex items-center p-0.5 bg-surface-container-low rounded-lg text-on-surface-variant font-label-sm text-label-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              isActive
                ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.icon && (
              <span className="text-[16px] inline-flex items-center">
                {typeof tab.icon === 'string' ? <AppIcon name={tab.icon} size={16} /> : tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
