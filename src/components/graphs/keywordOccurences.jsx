import { createColorScale } from "../../utils/d3process";
import * as d3 from 'd3';
import { DataContext } from '../../contexts/DataContext';
import { ModeContext } from "../../contexts/ModeContext";
import { useContext, useEffect, useRef } from 'react';

const KeywordOccurences = () => {
    const { data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);
    const svgRef = useRef();
    
    useEffect(() => {
        if (!data || data.length === 0) return;

        
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const width = 600 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        const color = createColorScale(data, mode, "rank");
        
        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // extract words from song titles (sick nasty)
        const commonWords = ["the", "and"];
        const wordCounts = {};
        data.forEach(d => {
            if (d.master_metadata_track_name) {
                const words = d.master_metadata_track_name
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !/[()[\]{}]/.test(word)); // filter short words and special characters
                
                words.forEach(word => {
                    wordCounts[word] = (wordCounts[word] || 0) + 1;
                    if (commonWords.includes(word)) {
                        wordCounts[word] -= 1; // eliminate common words by decrementing (smart!)
                    }
                });
            }
        });
        
        const keywordData = Object.entries(wordCounts)
            .map(([keyword, count]) => ({ keyword, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        console.log("KEYWORD DATA:", keywordData);
        
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(keywordData, d => d.count)])
            .range([0, width]);
        
        const yScale = d3.scaleBand()
            .domain(keywordData.map(d => d.keyword))
            .range([0, height])
            .padding(0.5);
        
        svg.selectAll(".lollipop-line")
            .data(keywordData)
            .enter()
            .append("line")
            .attr("class", "lollipop-line")
            .attr("x1", 0)
            .attr("x2", d => xScale(d.count))
            .attr("y1", d => yScale(d.keyword) + yScale.bandwidth() / 2)
            .attr("y2", d => yScale(d.keyword) + yScale.bandwidth() / 2)
            .attr("stroke", (d, i) => color(i))
            .attr("stroke-width", 2);
        
        svg.selectAll(".lollipop-circle")
            .data(keywordData)
            .enter()
            .append("circle")
            .attr("class", "lollipop-circle")
            .attr("cx", d => xScale(d.count))
            .attr("cy", d => yScale(d.keyword) + yScale.bandwidth() / 2)
            .attr("r", 6)
            .attr("fill", (d, i) => color(i))
            .attr("opacity", 0.8);
        
        svg.selectAll(".count-label")
            .data(keywordData)
            .enter()
            .append("text")
            .attr("class", "count-label")
            .attr("x", d => xScale(d.count) + 10)
            .attr("y", d => yScale(d.keyword) + yScale.bandwidth() / 2 + 4)
            .attr("fill", (d, i) => color(i))
            .attr("font-size", "12px")
            .text(d => d.count);
        
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", width / 2)
            .attr("y", 35)
            .style("text-anchor", "middle")
            .text("Occurrences");
        
        svg.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -30)
            .style("text-anchor", "middle")
            .text("Keyword");

    }, [data, mode]);

    return <svg ref={svgRef}></svg>;
}

export default KeywordOccurences;