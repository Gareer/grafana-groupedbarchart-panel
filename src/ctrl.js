import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
import * as d3 from './external/d3.v3.min';
import './css/groupedBarChart.css!';

const panelDefaults = {
    legend: {
        show: true
    },
    links: [],
    datasource: null,
    maxDataPoints: 3,
    interval: null,
    targets: [{}],
    cacheTimeout: null,
    nullPointMode: 'connected',
    aliasColors: {},
    format: 'short',
    valueName: 'current',
    strokeWidth: 1,
    fontSize: '80%',
    width: 960,
    height: 500,
    fixedWidth: 960,
    fixedHeight: 500,
    colorSet: [],
    colorSch: []
};

export class GroupedBarChartCtrl extends MetricsPanelCtrl {

    constructor($scope, $injector, $rootScope) {
        super($scope, $injector);
        this.$rootScope = $rootScope;
        this.hiddenSeries = {};
        this.data = null;

        _.defaults(this.panel, panelDefaults);
        this.setPanelSize();

        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
        this.events.on('data-error', this.onDataError.bind(this));
        this.events.on('panel-size-changed', this.onPanelSizeChanged.bind(this));
    }

    onInitEditMode() {
        this.addEditorTab('Options', 'public/plugins/grafana-groupedbarchart-panel/partials/editor.html', 2);
        this.addEditorTab('Colors', 'public/plugins/grafana-groupedbarchart-panel/partials/colors.html', 3);
    }

    setPanelSize(isFromUI) {
        let h = Math.ceil(this.panel.fixedHeight / 30);
        let w = Math.ceil(this.panel.fixedWidth / 50);
        if (isFromUI) {
            // Set panel width and height from panel UI
            if (w !== this.panel.gridPos.w || h !== this.panel.gridPos.h) {
                let gridPos = {x: 0, y: 0, w: 0, h: 0};
                gridPos.h = h;
                gridPos.w = w;
                this.panel.updateGridPos(gridPos);
            }
        } else {
            // Read panel width and height from default panel
            if (w !== this.panel.gridPos.w || h !== this.panel.gridPos.h) {
                this.panel.fixedHeight = this.panel.gridPos.h * 30;
                this.panel.fixedWidth = this.panel.gridPos.w * 50;
            }
        }
        this.panel.height =  this.panel.fixedHeight * 0.95;
        this.panel.width =  this.panel.fixedWidth * 0.85;
    }

    onPanelSizeChanged(isFromUI) {
        this.setPanelSize(isFromUI);
        this.render();
    }

    setUnitFormat(subItem) {
        this.panel.format = subItem.value;
        this.render();
    }

    onDataError() {
        this.render();
    }

    updateColorSet() {
        this.panel.colorSch = [];
        this.panel.colorSet.forEach(d=>this.panel.colorSch.push(d.color));
        this.render();
    }

    onDataReceived(dataList) {
        let o = _.groupBy(dataList[0].rows, e=>e[0]);
        _.forOwn(o, (e, i)=>{
            let t = _.groupBy(e, sta=>sta[1]);
            o[i] = _.forOwn(t, (sum, tid)=>{t[tid] = sum.map(s=>s[2]).reduce((y,x)=>y+x)})
        });

        let res = [];
        _.forOwn(o, (e, i)=> {
            e.label = i;
            res.push(e);
        });
        this.data = res.sort((a, b)=>{return (a.label>b.label)?-1:((b.label>a.label)?1:0)});
        this.render();
    }

    formatValue(value) {
        let decimalInfo = this.getDecimalsForValue(value);
        let formatFunc = kbn.valueFormats[this.panel.format];
        if (formatFunc) {
            return formatFunc(value, decimalInfo.decimals, decimalInfo.scaledDecimals);
        }
        return value;
    }

    link(scope, elem, attrs, ctrl) {
        class groupedBarChart {
            constructor(opts) {
                this.data = opts.data;
                this.margin = opts.margin;
                this.width = opts.width;
                this.height = opts.height;
                this.showLegend = opts.legend;
                this.element = elem.find(opts.element)[0];
                this.options = [];
                this.data.forEach(d => {
                    this.options = _.union(this.options, _.keys(d).filter(k => k !== 'label' && k !==  'valores'));
                });
                this.data.forEach(d => {
                    d.valores = this.options.map(name => {
                        return {name: name, value: d[name] || 0};
                    });
                });
                if(opts.color.length == 0) {
                    this.color = d3.scale.ordinal()
                        .range(d3.scale.category20().range());
                } else {
                    this.color = d3.scale.ordinal()
                        .range(opts.color);
                }

                this.draw();
            }

            draw() {
                d3.select(this.element).html("");
                this.svg = d3.select(this.element).append('svg');
                this.svg.attr('width', this.width + this.margin.left + this.margin.right)
                        .attr("height", this.height + this.margin.top + this.margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

                this.createScales();
                this.addAxes();
                this.addTooltips();
                this.addBar();
                if(this.showLegend) this.addLegend();
            }

            createScales() {
                this.x0 = d3.scale.ordinal()
                    .rangeRoundBands([0, this.width], .5);

                this.x1 = d3.scale.ordinal();

                this.y = d3.scale.linear()
                    .range([this.height, 0]);
            }

            addAxes() {
                this.xAxis = d3.svg.axis()
                    .scale(this.x0)
                    .tickSize(0)
                    .orient("bottom");

                this.yAxis = d3.svg.axis()
                    .scale(this.y)
                    .orient("left");

                this.x0.domain(this.data.map(d=> { return d.label; }));
                this.x1.domain(this.options).rangeRoundBands([0, this.x0.rangeBand()]);
                this.y.domain([0, d3.max(this.data, function(d) { return d3.max(d.valores, d=> { return d.value; }); })]);

                this.svg.append("g")
                  .attr("class", "x axis")
                  .attr("transform", "translate(0," + this.height + ")")
                  .call(this.xAxis);

                this.svg.append("g")
                  .attr("class", "y axis")
                  .style('opacity','0')
                  .call(this.yAxis)
                  .append("text")
                  .attr("transform", "rotate(-90)")
                  .attr("y", 6)
                  .attr("dy", ".71em")
                  .style("text-anchor", "end")
                  .style('font-weight','bold')
                  .text("Value");
            }

            addBar() {
                let self = this;
                this.bar = this.svg.selectAll('.bar')
                    .data(this.data)
                    .enter().append('g')
                    .attr('class', 'g')
                    .attr('transform', d=> {
                        return `translate(${this.x0(d.label)}, 0)`;
                    });

                this.barC = this.bar.selectAll('rect')
                    .data(d=> { return d.valores; })
                    .enter();

                this.barC.append('rect')
                    .attr('width', this.x1.rangeBand())
                    .attr('x', d=> { return this.x1(d.name);})
                    .attr('y', d=> { return this.y(d.value);})
                    .attr('height', d=> { return this.height - this.y(d.value);})
                    .style('fill', d=> { return this.color(d.name);})
                    .on("mouseover", function(d) {
                        // this.tips = d3.select(this).append('div').attr('class', 'toolTip')
                        // this.tips.style('left', `${10}px`);
                        // this.tips.style('top', `${15}px`);
                        // this.tips.style('display', "inline-block");
                        let color = self.color(d.name);
                        // this.tips.html(`${d.name} ,  ${d.value}`);
                        d3.select(this).style("fill", d3.rgb(color).darker(2));
                        self.tips
                            .style('display', 'inline')
                            .style('left', (event.pageX - 34) + 'px')
                            .style('top', (event.pageY - 12) + 'px')
                            .html(`<strong>${d.name}:</strong> <span style='color:red'>${d.value}</span>`);
                    })
                    .on("mouseout", function(d) {
                        d3.select(this).style("fill", self.color(d.name));
                        self.tips.style('display', "none");
                    });
            }

            addLegend() {
                this.legend = this.svg.selectAll('.legend')
                    .data(this.options.slice())
                    .enter().append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i)=> { return `translate(0,${i*20})`; });

                this.legend.append('rect')
                    .attr('x', this.width*1.1 - 18)
                    .attr('width', 18)
                    .attr('height', 18)
                    .style('fill', this.color);

                this.legend.append('text')
                    .attr('x', this.width*1.1 - 24)
                    .attr('y', 9)
                    .attr('dy', '.35em')
                    .style('text-anchor', 'end')
                    .text(d=> { return d; });

                this.legend.transition().duration(500).delay(function(d,i){ return 1300 + 100 * i; }).style("opacity","1");
            }

            addTooltips() {
                this.tips = this.svg.append('div')
                                    .attr('class', 'tooltip')
                                    .style('display', 'none');
            }
        }

        function onRender() {
            if(!ctrl.data) return;

            let Chart = new groupedBarChart({
                data: ctrl.data,
                margin: {top: 10, left: 10, bottom: 10, right: 10},
                element: '#chart',
                width: ctrl.panel.width,
                height: ctrl.panel.height,
                legend: ctrl.panel.legend.show,
                color: ctrl.panel.colorSch
            });

            ctrl.panel.colorSet = [];
            Chart.options.forEach(d=> {
                ctrl.panel.colorSet.push({text: d, color: Chart.color(d)});
            });
        }

        this.events.on('render', function() {
            onRender();
        });
    }
}

GroupedBarChartCtrl.templateUrl = 'partials/module.html';