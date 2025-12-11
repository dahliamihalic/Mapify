//top 5 streaming days bar chart 
import { createColorScale } from "../../utils/d3process";
import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { useContext } from 'react';
import { DataContext } from '../../contexts/DataContext.jsx';
import { ModeContext } from "../../contexts/ModeContext.jsx";

const BiggestStreamingDays = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const margin = { top: 30, right: 10, bottom: 60, left: 30 };
    const width = 450;
    const height = 500;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const ref = useRef();

    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;

        // date parse lolol
        const parseDate = d3.utcParse("%Y-%m-%dT%H:%M:%SZ");
        const formatDate = d3.utcFormat("%Y-%m-%d");

        // make timestamps understandable by d3
        const validData = data
            .filter(d => d && d.ts)
            .map(d => {
                const dt = parseDate(d.ts);
                return dt ? { ...d, date: formatDate(dt) } : null;
            })
            .filter(d => d !== null && d.ms_played > 0);

        if (validData.length === 0) return;

        // sum ms_played by date, convert to minutes
        const dateMsPlayed = {};
        validData.forEach(d => {
            dateMsPlayed[d.date] = (dateMsPlayed[d.date] || 0) + (d.ms_played || 0);
        });

        // get top 5 and sort chronologically, sum by minutes, then cry (WHY IS THIS SO HARDDDDDD)
        const streamsByDay = Object.entries(dateMsPlayed)
            .map(d => ({ date: d[0], minutes: d[1] / 60000 }))
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, 5)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();

        const tooltip = d3.select("body")
            .selectAll(".biggest-days-tooltip")
            .data([null])
            .join("div")
            .attr("class", "tooltip biggest-days-tooltip")
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
                    <strong>${d.date}</strong><br/>
                    Minutes Streamed: ${d.minutes.toFixed(2)}
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

        console.log("DATA FOR SCALE:", data);

        const xScale = d3
            .scaleBand()
            .domain(streamsByDay.map((d) => d.date))
            .range([0, innerWidth])
            .padding(0.1);

        const colorScale = createColorScale(streamsByDay, mode, "rank"); //modecontext
        colorScale.domain(streamsByDay.map((d) => d.date));

        const yScale = d3
            .scaleLinear()
            .domain([0, d3.max(streamsByDay, (d) => d.minutes)])
            .nice()
            .range([innerHeight, 0]);

        const g = svg
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // bars. bars. bars. bars. 
        if (streamsByDay.some(d => !d.date || isNaN(d.minutes))) {
            console.error("INVALID STREAMS:", streamsByDay);
            return; 
        }
        g.selectAll("rect")
            .data(streamsByDay)
            .join("rect")
            .attr("x", (d) => xScale(d.date))
            .attr("y", (d) => yScale(d.minutes))
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => innerHeight - yScale(d.minutes))
            .attr("fill", (d) => colorScale(d.date))
            .on("mouseover", (event, d) => showTooltip(event, d))
            .on("mousemove", (event) => moveTooltip(event))
            .on("mouseout", (event) => hideTooltip(event.currentTarget));

        svg.on("mouseleave", () => hideTooltip());

        // x-axis
        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // y-axis
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(5))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (innerHeight / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Minutes Streamed");



        return () => {
            tooltip.remove();
            svg.selectAll("*").remove();
        };
    }, [data, width, height, mode]);

    return <svg ref={ref} />;
};

export default BiggestStreamingDays;