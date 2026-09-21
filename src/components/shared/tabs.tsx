import { forwardRef, useState, type ReactElement } from 'react';

type Tab = {
    title: string;
    content: ReactElement;
};

interface ComponentTabsProps {
    tabs: Tab[];
}

const Tabs = forwardRef<HTMLDivElement, ComponentTabsProps>(({ tabs }, ref) => {
    const [activeTab, setActiveTab] = useState(tabs[0]?.title);

    const tabElements = (
        <div className='flex flex-row flex-wrap'>
            {tabs.map((tab) => {
                return (
                    <button
                        key={tab.title}
                        className={`px-4 py-2 text-sm leading-5 font-medium transition-colors duration-150 ${
                            activeTab === tab.title
                                ? 'border-b-2 border-gray-500'
                                : 'border-b border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                        onClick={() => {
                            setActiveTab(tab.title);
                        }}
                    >
                        {tab.title}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div ref={ref} className='flex h-full w-full flex-col bg-white'>
            {tabElements}
            <div className={`grow overflow-scroll rounded-tr-md rounded-b-md border-2 border-gray-100 p-2`}>
                {tabs.map((tab) => (
                    <div className='h-full' key={tab.title} hidden={activeTab !== tab.title}>
                        {tab.content}
                    </div>
                ))}
            </div>
        </div>
    );
});

export default Tabs;
