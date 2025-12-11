import { createColorScale } from "../../../utils/d3process.js";
import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { useContext } from 'react';
import { DataContext } from '../../../contexts/DataContext.jsx';
import { ModeContext } from "../../../contexts/ModeContext.jsx";

const TotalStreamingTime = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const margin = { top: 30, right: 20, bottom: 60, left: 50 };
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        const totalTime = d3.sum(data, d => d.ms_played || 0);
        const totalHours = (totalTime / (1000 * 60 * 60)).toFixed(2);
        const totalMinutes = (totalTime / (1000 * 60)).toFixed(0);
        const totalDays = (totalTime / (1000 * 60 * 60 * 24)).toFixed(2);

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); const 
        const width = 450 - margin.left - margin.right;
        const height = 420 - margin.top - margin.bottom;
        svg
            .attr("width", width)
            .attr("height", height);
        const textColor = mode === 'light' ? '#040605' : '#f9fbfa';
        const accentColor = mode === 'light' ? '#4ba3c3' : '#55d89b';
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top)
            .attr("text-anchor", "middle")
            .attr("font-size", "24px")
            .attr("fill", textColor)
            .text("Total Streaming Time");
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2 - 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "64px")
            .attr("fill", accentColor)
            .text(`${totalHours} hrs`);
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2 + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("fill", textColor)
            .text(`(${totalMinutes} minutes)`);
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2 + 70)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .attr("fill", textColor)
            .text(`(~${totalDays} days)`);
    }, [data, mode]);
    return <svg ref={svgRef}></svg>;
}
export default TotalStreamingTime;