//most skipped songs pie chart 
import { createColorScale } from "../../utils/d3process";
import React from 'react';
import * as d3 from 'd3';
import { DataContext } from '../../contexts/DataContext';
import { ModeContext } from "../../contexts/ModeContext";
import { useContext, useEffect, useRef } from 'react';

const MostSkipped = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);

    const svgRef = useRef();
    
    useEffect(() => {
        if (!data || data.length === 0) return;
        const margin = { top: 20, right: 30, bottom: 40, left: 20 };
        const width = 500 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        
        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left + width / 2},${margin.top + height / 2})`);
        
        // count skipped songs or sumn idk 
        const skippedData = data.filter(d => d.skipped === true || d.skipped === "True" || d.skipped === 1);
        
        const skipCounts = d3.rollups(
            skippedData,
            v => ({
                count: v.length,
                artist: v[0].master_metadata_album_artist_name,
                album: v[0].master_metadata_album_album_name
            }),
            d => d.master_metadata_track_name)
            .map(d => ({ track: d[0], ...d[1] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);
        
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(Math.min(width, height) / 2 - 1);

        const arcs = svg.selectAll("arc")
            .data(pie(skipCounts))
            .enter()
            .append("g")
            .attr("class", "arc");
        
        const color = createColorScale(skipCounts, mode, "rank");
        
        arcs.append("path")
            .attr("d", arc)
            .attr("fill", (d, i) => color(i))
            .on("mouseover", function(event, d) { //tooltips (theoretically)
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("position", "absolute")
                    .style("padding", "8px 12px")
                    .style("border-radius", "4px")
                    .style("pointer-events", "none")
                    .style("font-size", "12px")
                    .style("z-index", "1000")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
                
                tooltip.html(`
                    <strong>${d.data.track}</strong><br/>
                    Artist: ${d.data.artist}<br/>
                    Album: ${d.data.album}<br/>
                    Skipped: ${d.data.count} times
                `);
                
                d3.select(this).style("opacity", 0.7);
            })
            .on("mousemove", function(event) {
                d3.select(".tooltip")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(".tooltip").remove();
                d3.select(this).style("opacity", 1);
            });
        //text labels
        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .text(d => `${d.data.track} (${d.data.count})`)
            .style("font-size", "10px")
            .style("pointer-events", "none");
        
        return () => {
            d3.select(svgRef.current).selectAll("*").remove();
        };
    }, [data, mode]);
    
    return <svg ref={svgRef}></svg>;
};

export default MostSkipped;