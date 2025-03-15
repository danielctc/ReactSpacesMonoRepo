/**
 * This script can be pasted into the browser console to check if the background element is visible in the DOM
 */

(function checkBackgroundVisibility() {
  // Find all elements with position: absolute
  const absoluteElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = window.getComputedStyle(el);
    return style.position === 'absolute';
  });
  
  console.log('Found', absoluteElements.length, 'elements with position: absolute');
  
  // Check for elements that might be the background
  const possibleBackgrounds = absoluteElements.filter(el => {
    const style = window.getComputedStyle(el);
    return (
      (style.backgroundImage && style.backgroundImage !== 'none') ||
      (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') ||
      (el.style.zIndex && parseInt(el.style.zIndex) >= 20)
    );
  });
  
  console.log('Found', possibleBackgrounds.length, 'possible background elements:');
  possibleBackgrounds.forEach((el, index) => {
    const style = window.getComputedStyle(el);
    console.log(`Element ${index + 1}:`, {
      element: el,
      backgroundImage: style.backgroundImage,
      backgroundColor: style.backgroundColor,
      zIndex: style.zIndex,
      width: style.width,
      height: style.height,
      display: style.display,
      opacity: style.opacity,
      visibility: style.visibility
    });
  });
  
  // Check if any elements have been added by PersistentBackground component
  const unityContainer = document.querySelector('.webgl-renderer [ref="unityContainerRef"]') || 
                         document.querySelector('.webgl-renderer > div > div');
  
  if (unityContainer) {
    console.log('Unity container found:', unityContainer);
    console.log('Unity container children:', unityContainer.children);
    
    // Check for background elements
    const bgElements = Array.from(unityContainer.children).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === 'absolute' && parseInt(style.zIndex) >= 20;
    });
    
    console.log('Background elements in Unity container:', bgElements);
  } else {
    console.log('Unity container not found');
  }
  
  return 'Background visibility check complete';
})(); 