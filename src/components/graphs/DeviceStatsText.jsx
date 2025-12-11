import React, { useEffect, useRef, useContext } from "react";
import * as d3 from "d3";
import { createColorScale } from "../../utils/d3process";
import { DataContext } from "../../contexts/DataContext";
import { ModeContext } from "../../contexts/ModeContext";

const DeviceStatsText = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const margin = { top: 30, right: 0, bottom: 60, left: 0 };
    const svgRef = useRef();
    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        
        // Extract device model from platform string (e.g., "iOS 9.2.1 (iPhone5,1)" -> "iPhone5,1")
        const extractDeviceModel = (platform) => {
            if (!platform) return 'Unknown';
            const match = platform.match(/\(([^)]+)\)/);
            return match ? match[1] : platform;
        };
        
        const margin = { top: 30, right: 0, bottom: 60, left: 0 };
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const width = 600;
        const height = 400;
        const deviceTotals = d3.rollup(
            data,
            v => v.length,
            d => extractDeviceModel(d.platform)
        );
        const platforms = Array.from(deviceTotals.keys())
            .sort((a, b) => (deviceTotals.get(b) || 0) - (deviceTotals.get(a) || 0));
        svg
            .attr("width", width)
            .attr("height", height);
        const textColor = mode === 'light' ? '#040605' : '#f9fbfa';
        svg.append("text")
            .attr("x", 10)
            .attr("y", margin.top)
            .attr("font-size", "24px")
            .attr("font-weight", "bold")
            .attr("fill", textColor)
            .text("Top Devices Used");
        platforms.slice(0, 3).forEach((platform, index) => {
            svg.append("text")
                .attr("x", 10)
                .attr("y", margin.top + 40 + index * 40)
                .attr("font-size", "18px")
                .attr("fill", textColor)
                .text(`${platform}: ${deviceTotals.get(platform).toLocaleString()} streams`);
        });
    }, [data, mode]);

    return <svg ref={svgRef}></svg>;
}
export default DeviceStatsText;