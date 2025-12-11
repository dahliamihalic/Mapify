import * as d3 from "d3";

// Light Mode: 20 visually distinct, accessible colors
const LM_COLORS = [
    "#D62839", "#BA324F", "#175676", "#4BA3C3", "#CCE6F4",
    "#FF8C42", "#FFA97B", "#FFB6B9", "#F4EBC1", "#A8DADC",
    "#F94144", "#F3722C", "#F8961E", "#F9C74F", "#90BE6D",
    "#43AA8B", "#577590", "#7209B7", "#B5179E", "#F72585"
];

const LM_RANKED_COLORS = [
    "#BA324Ff2", "#BA324Fd9", "#BA324Fbf","#BA324Fa6", "#BA324F8c",
    "#BA324F73", "#BA324F59", "#BA324F40","#BA324F26", "#BA324Fe6", 
    "#BA324Fcc", "#BA324Fb3", "#BA324F99", "#BA324F66", "#BA324F66", 
    "#BA324F4d", "#BA324F33", "#BA324F1a", "#BA324F0d"
];

const LM_RANKED_COLORS_ALT = [
    "#175676f2", "#175676d9", "#175676bf","#175676a6", "#1756768c",
    "#17567673", "#17567659", "#17567640","#17567626", "#175676e6", 
    "#175676cc", "#175676b3", "#17567699", "#17567666", "#17567666", 
    "#1756764d", "#17567633", "#1756761a", "#1756760d"
];

// Dark Mode: 20 visually distinct, accessible colors
const DM_COLORS = [
    "#55D89B", "#6BCCA9", "#84C8C3", "#53E93F", "#9ABEC6",
    "#F9C74F", "#F8961E", "#F3722C", "#F94144", "#90BE6D",
    "#43AA8B", "#577590", "#7209B7", "#B5179E", "#F72585",
    "#FF6B6B", "#4D908E", "#1D3557", "#E63946", "#A8DADC"
];

//wrote this one meself:
const DM_RANKED_COLORS = [
    "#6bcca9f2", "#6bcca9d9", "#6bcca9bf","#6bcca9a6", "#6bcca98c",
    "#6bcca973", "#6bcca959", "#6bcca940","#6bcca926", "#6bcca9e6", 
    "#6bcca9cc", "#6bcca9b3", "#6bcca999", "#6bcca966", "#6bcca966", 
    "#6bcca94d", "#6bcca933", "#6bcca91a", "#6bcca90d"
];

const DM_RANKED_COLORS_ALT = [
    "#53E93Ff2", "#53E93Fd9", "#53E93Fbf","#53E93Fa6", "#53E93F8c",
    "#53E93F73", "#53E93F59", "#53E93F40","#53E93F26", "#53E93Fe6", 
    "#53E93Fcc", "#53E93Fb3", "#53E93F99", "#53E93F66", "#53E93F66", 
    "#53E93F4d", "#53E93F33", "#53E93F1a", "#53E93F0d"
];


export const createColorScale = (categories = [], mode = "dark", theme = "constant", alt=false) => {
    const baseColors = mode === "light" ? (theme === "constant" ? LM_COLORS : alt ? LM_RANKED_COLORS_ALT : LM_RANKED_COLORS) : (theme === "constant" ? DM_COLORS : alt ? DM_RANKED_COLORS_ALT : DM_RANKED_COLORS);

    // If more than 20 categories, repeat the palette
    const colorRange = categories.map((_, i) => baseColors[i % baseColors.length]);

    return d3.scaleOrdinal()
        .domain(categories)
        .range(colorRange);
};
