// hooks/useFadeStyles.js
export const useFadeStyles = (isVisible) => {
    return {
        opacity: isVisible ? 1 : 1,
        //transition: "opacity 0.25s ease-in-out",
    };
}