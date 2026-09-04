import { useEffect, useState } from 'react';

import { useFullscreenTarget } from './fullscreen-target';

export const Fullscreen = () => {
    const targetRef = useFullscreenTarget();
    const isFullscreen = useFullscreenStatus();
    return (
        <button
            onClick={() => {
                if (isFullscreen) {
                    void document.exitFullscreen();
                } else if (targetRef?.current) {
                    void targetRef.current.requestFullscreen();
                }
            }}
            className={`btn btn-xs`}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
            <div
                className={`iconify text-2xl ${isFullscreen ? 'mdi--fullscreen-exit hover:scale-90' : 'mdi--fullscreen hover:scale-110'}`}
            />
        </button>
    );
};

function useFullscreenStatus(): boolean {
    const [isFullscreen, setIsFullscreen] = useState<boolean>(document.fullscreenElement !== null);
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement !== null);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    return isFullscreen;
}
