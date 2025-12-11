import { createColorScale } from "../../../utils/d3process";
import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { useContext } from 'react';
import { DataContext } from '../../../contexts/DataContext.jsx';
import { ModeContext } from "../../../contexts/ModeContext.jsx";

const top5Artists = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const margin = { top: 30, right: 20, bottom: 80, left: 50 };
    const width = 450 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;
    const ref = useRef();
    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;

        const artistCounts = d3.rollups(
            data,
            v => v.length,
            d => d.master_metadata_album_artist_name
        )
            .map(d => ({ artist: d[0], count: d[1] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();

        const tooltip = d3.select("body")
            .selectAll(".top5-artists-tooltip")
            .data([null])
            .join("div")
            .attr("class", "tooltip top5-artists-tooltip")
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
                    <strong>Artist:</strong> ${d.artist}<br/>
                    <strong>Streams:</strong> ${d.count}
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
        const xScale = d3
            .scaleBand()
            .domain(artistCounts.map((d) => d.artist))
            .range([0, width])
            .padding(0.1);
        const colorScale = createColorScale(artistCounts, mode, "rank");
        colorScale.domain(artistCounts.map((d) => d.artist));
        const yScale = d3
            .scaleLinear()
            .domain([0, d3.max(artistCounts, (d) => d.count)])
            .range([height, 0]);
        const chart = svg
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        chart
            .selectAll(".bar")
            .data(artistCounts) 
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d.artist))
            .attr("y", (d) => yScale(d.count))
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => height - yScale(d.count))
            .attr("fill", (d, i) => colorScale(i))
            .on("mouseover", (event, d) => showTooltip(event, d))
            .on("mousemove", (event) => moveTooltip(event))
            .on("mouseout", (event) => hideTooltip(event.currentTarget));

        svg.on("mouseleave", () => hideTooltip());
        chart
            .append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");
        chart.append("g").call(d3.axisLeft(yScale));
        chart.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .attr("font-size", "22px")
            .attr("font-weight", "bold")
            .text("Top 5 Artists");

        return () => {
            tooltip.remove();
            svg.selectAll("*").remove();
        };
    }, [data, mode]);

    return <svg ref={ref}></svg>;
};
export default top5Artists;