import React, { useEffect, useRef, useContext } from "react";
import * as d3 from "d3";
import { createColorScale } from "../../utils/d3process";
import { DataContext } from "../../contexts/DataContext";
import { ModeContext } from "../../contexts/ModeContext";

const DeviceStats = () => {
    const { filteredData } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const svgRef = useRef();

    useEffect(() => {
        if (!filteredData || filteredData.length === 0) return;

        const margin = { top: 20, right: 150, bottom: 60, left: 90 };
        const width = 1200 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svgEl = d3.select(svgRef.current);
        svgEl.selectAll("*").remove(); // Cleanup

        const svg = svgEl
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Parse timestamps
        const parseDate = d => {
            const formats = [
                "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S.%LZ",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%dT%H:%M:%S%Z"
            ];
            for (const f of formats) {
                const dt = d3.utcParse(f)(d);
                if (dt) return dt;
            }
            return null;
        };

        // Extract device model from platform string (e.g., "iOS 9.2.1 (iPhone5,1)" -> "iPhone5,1")
        const extractDeviceModel = (platform) => {
            if (!platform) return 'Unknown';
            const match = platform.match(/\(([^)]+)\)/);
            return match ? match[1] : platform;
        };

        // Map data
        const parsed = filteredData
            .map(d => {
                const dt = parseDate(d.ts);
                const deviceModel = extractDeviceModel(d.platform);
                return { ...d, date: dt, year: dt ? dt.getUTCFullYear() : null, deviceModel };
            })
            .filter(d => d.date);

        // Platforms sorted by total play count (using device model instead of full platform string)
        const platformTotals = d3.rollup(parsed, v => v.length, d => d.deviceModel);
        const platforms = Array.from(platformTotals.keys())
            .sort((a, b) => (platformTotals.get(b) || 0) - (platformTotals.get(a) || 0));

        // Years
        const years = Array.from(new Set(parsed.map(d => d.year))).sort((a, b) => a - b);

        // Aggregate data by year
        const dataByYear = years.map(year => {
            const row = { year };
            platforms.forEach(p => (row[p] = 0));
            parsed
                .filter(d => d.year === year)
                .forEach(d => (row[d.deviceModel] = (row[d.deviceModel] || 0) + 1));
            return row;
        });

        // Stack
        const stack = d3.stack().keys(platforms)(dataByYear);

        // Scales
        const x = d3.scaleBand()
            .domain(years)
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(dataByYear, d => platforms.reduce((sum, k) => sum + d[k], 0))])
            .nice()
            .range([height, 0]);

        const colorScale = createColorScale(platforms, mode, "constant"); // light for MODE CONTEXT
        colorScale.domain(platforms);

        // Axes
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => d))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y).ticks(5))
            .style("font-size", "12px");

        const tooltip = d3.select("body")
            .selectAll(".device-stats-tooltip")
            .data([null])
            .join("div")
            .attr("class", "tooltip device-stats-tooltip")
            .style("position", "absolute")
            .style("padding", "6px 10px")
            .style("border-radius", "6px")
            .style("pointer-events", "none")
            .style("background", "white")
            .style("color", "black")
            .style("display", "none")
            .style("opacity", 0);

        const showTooltip = (event, d) => {
            const platformKey = event.currentTarget.parentNode.__data__.key;
            tooltip
                .style("display", "block")
                .style("opacity", 1)
                .html(`<strong>${platformKey}</strong><br>Year: ${d.data.year}<br>Count: ${d.data[platformKey]}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        };

        const moveTooltip = (event) => {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        };

        const hideTooltip = () => {
            tooltip.style("opacity", 0).style("display", "none");
        };

        // Draw stacked bars with transition
        const groups = svg.selectAll("g.layer")
            .data(stack)
            .join("g")
            .attr("class", "layer")
            .attr("fill", d => colorScale(d.key));

        groups.selectAll("rect")
            .data(d => d)
            .join("rect")
            .attr("x", d => x(d.data.year))
            .attr("y", y(0)) // Start from bottom
            .attr("height", 0) // Start from zero
            .attr("width", x.bandwidth())
            .on("mouseover", (event, d) => showTooltip(event, d))
            .on("mousemove", (event) => moveTooltip(event))
            .on("mouseout", () => hideTooltip())
            .transition() // Animate bars
            .duration(800)
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]));

        d3.select(svgRef.current).on("mouseleave", () => hideTooltip());

        // Legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 20},0)`);

        legend.selectAll("g")
            .data(platforms)
            .join("g")
            .attr("transform", (d, i) => `translate(0, ${i * 18})`)
            .call(g => g.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", d => colorScale(d)))
            .call(g => g.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .text(d => d)
                .style("font-size", "12px")
                .style("alignment-baseline", "middle"));

        return () => tooltip.remove(); // Cleanup
    }, [filteredData, mode]);

    return (
        <>
            <svg ref={svgRef}></svg>
        </>);
};

export default DeviceStats;
