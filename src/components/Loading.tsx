import React from 'react';

interface LoadingProps {
    fullScreen?: boolean;
    className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = true, className = "" }) => {
    const loaderContent = (
        <div className={`lds-ellipsis ${className}`}>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="loader-container">
                {loaderContent}
            </div>
        );
    }

    return loaderContent;
};
