import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export async function loadTheme(themeName) {
    let themeModule;

    try {
        // Using switch-case to manage theme imports
        switch (themeName) {
            case 'default':
                themeModule = await import('./default');
                break;
            // case 'dark':
            //     themeModule = await import('@disruptive-spaces/shared/themes/dark');
            //     break;
            // case 'light':
            //     themeModule = await import('@disruptive-spaces/shared/themes/light');
            //     break;




            default:
                themeModule = await import('./default');
        }
        return themeModule.default;
    } catch (error) {
        Logger.error("Failed to load theme:", error);
        // Fallback to default theme in case of error
        themeModule = await import('./default');
        return themeModule.default;
    }
}