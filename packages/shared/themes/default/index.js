// theme/index.js
import { extendTheme } from "@chakra-ui/react";
import colors from './colors';

import { loadFonts } from './loadFonts';
loadFonts();

import { modalTheme } from './components/modals';
import { inputTheme } from "./components/input";
import { textareaTheme } from "./components/textArea";
import { buttonTheme } from './components/buttons';
import { linkTheme } from './components/link';
import { textTheme } from "./components/text";
import { FormLabel } from "./components/formLabel";
import { Tooltip } from "./components/tooltips";
import { Progress } from "./components/progress";
import { alertTheme } from "./components/alerts";

const fonts = {
    body: "Mona Sans, sans-serif",
    heading: "Mona Sans, sans-serif",
};

const components = {
    Input: inputTheme,
    Textarea: textareaTheme,
    Modal: modalTheme,
    Button: buttonTheme,
    Link: linkTheme,
    Text: textTheme,
    alertTheme: alertTheme,
    Tooltip,
    Progress,
    FormLabel,

};

const theme = extendTheme({
    fonts,
    colors,
    components,
});

export default theme;
