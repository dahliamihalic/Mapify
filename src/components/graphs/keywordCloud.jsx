import { createColorScale } from "../../utils/d3process";
import * as d3 from "d3";
import { DataContext } from "../../contexts/DataContext";
import { ModeContext } from "../../contexts/ModeContext";
import { useContext, useEffect, useRef } from "react";
import d3Cloud from "d3-cloud";

const KeywordCloud = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        d3.select(svgRef.current).selectAll("*").remove();

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = 600 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const color = createColorScale(data, mode, "constant");

        const svg = d3
            .select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const commonWords = ["the", "and", "for"];
        const wordCounts = {};

        const cleanTitle = (title) =>
            title
                .toLowerCase()
                .replace(/[\(\[].*?(feat\.?|featuring|with).*?[\)\]]/gi, "")
                .replace(/\s*-\s*(feat\.?|featuring|with).*/gi, "")
                .replace(/[^\w\s]/g, " ")
                .trim();

        data.forEach(d => {
            if (!d.master_metadata_track_name) return;

            const cleaned = cleanTitle(d.master_metadata_track_name);

            cleaned
                .split(/\s+/)
                .filter(word => word.length > 2)
                .forEach(word => {
                    wordCounts[word] = (wordCounts[word] || 0) + 1;
                    if (commonWords.includes(word)) {
                        wordCounts[word] -= 1;
                    }
                });
        });

        Object.keys(wordCounts).forEach(word => {
            if (wordCounts[word] <= 0) delete wordCounts[word];
        });

        const keywordData = Object.entries(wordCounts)
            .map(([keyword, count]) => ({ keyword, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 30);

        if (keywordData.length === 0) return;

        const minFont = 14;
        const maxFont = 60;

        const minCount = Math.max(
            1,
            d3.min(keywordData, d => d.count)
        );

        const maxCount = d3.max(keywordData, d => d.count);

        const fontScale = d3.scaleLog()
            .domain([minCount, maxCount])
            .range([minFont, maxFont]);

        const words = keywordData.map((d, i) => ({
            text: d.keyword,
            value: d.count,
            size: fontScale(d.count),
            color: color(i)
        }));

        const tooltip = d3
            .select("body")
            .selectAll(".wordcloud-tooltip")
            .data([null])
            .join("div")
            .attr("class", "tooltip wordcloud-tooltip")
            .style("position", "absolute")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("font-size", "12px")
            .style("z-index", "1000")
            .style("background", "white")
            .style("color", "black")
            .style("display", "none")
            .style("opacity", 0);

        const showTooltip = (event, d) => {
            tooltip
                .style("display", "block")
                .style("opacity", 1)
                .html(`
                    <strong>Word:</strong> ${d.text}<br/>
                    <strong>Occurrences:</strong> ${d.value}
                `)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`);

            d3.select(event.currentTarget).style("opacity", 0.7);
        };

        const moveTooltip = (event) => {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`);
        };

        const hideTooltip = (target) => {
            tooltip.style("opacity", 0).style("display", "none");
            if (target) d3.select(target).style("opacity", 1);
        };

        const layout = d3Cloud()
            .size([width, height])
            .words(words)
            .padding(4)
            .rotate(() => 0)
            .font("DM Serif Text")
            .fontSize(d => d.size)
            .on("end", draw);

        layout.start();

        function draw(words) {
            const texts = svg
                .append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`)
                .selectAll("text")
                .data(words)
                .enter()
                .append("text")
                .style("font-size", d => `${d.size}px`)
                .style("fill", d => d.color)
                .style("cursor", "default")
                .attr("text-anchor", "middle")
                .attr("transform", d =>
                    `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
                )
                .text(d => d.text)
                .on("mouseover", (event, d) => showTooltip(event, d))
                .on("mousemove", moveTooltip)
                .on("mouseout", (event) => hideTooltip(event.currentTarget));

            texts.append("title")
                .text(d => `${d.text}: ${d.value}`);

            svg.on("mouseleave", () => hideTooltip());
        }
    }, [data, mode]);

    return <svg ref={svgRef} />;
};

export default KeywordCloud;
