import { createColorScale } from "../../utils/d3process";
import * as d3 from 'd3';
import { DataContext } from '../../contexts/DataContext';
import { ModeContext } from "../../contexts/ModeContext";
import { useContext, useEffect, useRef } from 'react';

const MostPicked = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const svgRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;
        const margin = { top: 20, right: 30, bottom: 40, left: 90 };
        const width = 500 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left + width / 2},${margin.top + height / 2})`);
        const pickedData = data.filter(d => d.reason_start === "clickrow");
        const pickCounts = d3.rollups(
            pickedData,
            v => ({
                count: v.length,
                artist: v[0].master_metadata_album_artist_name,
                album: v[0].master_metadata_album_album_name
            }),
            d => d.master_metadata_track_name)
            .map(d => ({ track: d[0], ...d[1] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
            console.log("PICK COUNTS:", pickCounts);
            const hierarchy = d3.hierarchy({ values: pickCounts }, d => d.values)
            .sum(d => d.count);
            const treeGen = d3.treemap()
            .size([width, height])
            .padding(4);
        treeGen(hierarchy);
        const color = createColorScale(pickCounts, mode, "rank");
        svg.selectAll("rect")
        svg.selectAll("rect")
            .data(hierarchy.leaves())
            .enter()
            .append("rect")
            .attr("x", d => d.x0 - width / 2)
            .attr("y", d => d.y0 - height / 2)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
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
                                Picked: ${d.data.count} times
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
        svg.selectAll("text")
            .data(hierarchy.leaves())
            .enter()
            .append("text")
            .attr("x", d => d.x0 - width / 2 + 5)
            .attr("y", d => d.y0 - height / 2 + 20)
            //.attr("transform", "rotate(90)")
            .text(d => d.data.track)
            .attr("font-size", "12px")
        
        
    }, [data, mode]);

    return (
        <svg ref={svgRef}></svg>
    );
};

export default MostPicked;

            