'use strict';

System.register(['app/plugins/sdk', 'lodash', 'app/core/utils/kbn', 'app/core/time_series', './external/d3.v3.min', './css/groupedBarChart.css!'], function (_export, _context) {
    "use strict";

    var MetricsPanelCtrl, _, kbn, TimeSeries, d3, _createClass, panelDefaults, GroupedBarChartCtrl;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    return {
        setters: [function (_appPluginsSdk) {
            MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
        }, function (_lodash) {
            _ = _lodash.default;
        }, function (_appCoreUtilsKbn) {
            kbn = _appCoreUtilsKbn.default;
        }, function (_appCoreTime_series) {
            TimeSeries = _appCoreTime_series.default;
        }, function (_externalD3V3Min) {
            d3 = _externalD3V3Min;
        }, function (_cssGroupedBarChartCss) {}],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            panelDefaults = {
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

            _export('GroupedBarChartCtrl', GroupedBarChartCtrl = function (_MetricsPanelCtrl) {
                _inherits(GroupedBarChartCtrl, _MetricsPanelCtrl);

                function GroupedBarChartCtrl($scope, $injector, $rootScope) {
                    _classCallCheck(this, GroupedBarChartCtrl);

                    var _this = _possibleConstructorReturn(this, (GroupedBarChartCtrl.__proto__ || Object.getPrototypeOf(GroupedBarChartCtrl)).call(this, $scope, $injector));

                    _this.$rootScope = $rootScope;
                    _this.hiddenSeries = {};
                    _this.data = null;

                    _.defaults(_this.panel, panelDefaults);
                    _this.setPanelSize();

                    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
                    _this.events.on('data-received', _this.onDataReceived.bind(_this));
                    _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
                    _this.events.on('data-error', _this.onDataError.bind(_this));
                    _this.events.on('panel-size-changed', _this.onPanelSizeChanged.bind(_this));
                    return _this;
                }

                _createClass(GroupedBarChartCtrl, [{
                    key: 'onInitEditMode',
                    value: function onInitEditMode() {
                        this.addEditorTab('Options', 'public/plugins/grafana-groupedbarchart-panel/partials/editor.html', 2);
                        this.addEditorTab('Colors', 'public/plugins/grafana-groupedbarchart-panel/partials/colors.html', 3);
                    }
                }, {
                    key: 'setPanelSize',
                    value: function setPanelSize(isFromUI) {
                        var h = Math.ceil(this.panel.fixedHeight / 30);
                        var w = Math.ceil(this.panel.fixedWidth / 50);
                        if (isFromUI) {
                            // Set panel width and height from panel UI
                            if (w !== this.panel.gridPos.w || h !== this.panel.gridPos.h) {
                                var gridPos = { x: 0, y: 0, w: 0, h: 0 };
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
                        this.panel.height = this.panel.fixedHeight * 0.95;
                        this.panel.width = this.panel.fixedWidth * 0.8;
                    }
                }, {
                    key: 'onPanelSizeChanged',
                    value: function onPanelSizeChanged(isFromUI) {
                        this.setPanelSize(isFromUI);
                        this.render();
                    }
                }, {
                    key: 'setUnitFormat',
                    value: function setUnitFormat(subItem) {
                        this.panel.format = subItem.value;
                        this.render();
                    }
                }, {
                    key: 'onDataError',
                    value: function onDataError() {
                        this.render();
                    }
                }, {
                    key: 'updateColorSet',
                    value: function updateColorSet() {
                        var _this2 = this;

                        this.panel.colorSch = [];
                        this.panel.colorSet.forEach(function (d) {
                            return _this2.panel.colorSch.push(d.color);
                        });
                        this.render();
                    }
                }, {
                    key: 'onDataReceived',
                    value: function onDataReceived(dataList) {
                        // only support table format and support 3 columns: label, legend, value
                        if (dataList.length < 1 || !dataList[0].rows || dataList[0].rows.length < 1) {
                            console.log('no data');
                            return;
                        }
                        if (dataList[0].type !== 'table') {
                            console.log('only support table format!');
                            return;
                        }
                        var myData = dataList[0].rows;
                        if (this.datasource.type === 'prometheus' || this.datasource.type === 'influxdb') {
                            // default takes 4 columns of data: time, label, legend, value
                            var legendColumn = this.panel.targets[0].legendFormat;
                            var vIndex = myData[0].length - 1;
                            var legendIndex = _.isUndefined(legendColumn) ? vIndex - 1 : this.findColumnIndex(dataList[0].columns, legendColumn);
                            var labelIndex = vIndex - legendIndex > 1 ? legendIndex + 1 : legendIndex - 1;
                            if (legendIndex < 0 || labelIndex < 0 || labelIndex >= vIndex) {
                                console.log('data length is invalid.');
                                return;
                            } else {
                                myData = dataList[0].rows.map(function (r) {
                                    return [r[labelIndex], r[legendIndex], r[vIndex]];
                                });
                            }
                        }
                        var o = _.groupBy(myData, function (e) {
                            return e[0];
                        });
                        _.forOwn(o, function (e, i) {
                            var t = _.groupBy(e, function (sta) {
                                return sta[1];
                            });
                            o[i] = _.forOwn(t, function (items, tid) {
                                t[tid] = _.max(items.map(function (s) {
                                    return s[2];
                                }));
                            });
                        });

                        var res = [];
                        _.forOwn(o, function (e, i) {
                            e.label = i;
                            res.push(e);
                        });
                        this.data = res.sort(function (a, b) {
                            return a.label < b.label ? -1 : b.label < a.label ? 1 : 0;
                        });

                        this.render();
                    }
                }, {
                    key: 'findColumnIndex',
                    value: function findColumnIndex(data, column) {
                        var index = -1;
                        _.each(data, function (d, i) {
                            if (d.text === column) {
                                index = i;
                            }
                        });
                        return index;
                    }
                }, {
                    key: 'formatValue',
                    value: function formatValue(value) {
                        var decimalInfo = this.getDecimalsForValue(value);
                        var formatFunc = kbn.valueFormats[this.panel.format];
                        if (formatFunc) {
                            return formatFunc(value, decimalInfo.decimals, decimalInfo.scaledDecimals);
                        }
                        return value;
                    }
                }, {
                    key: 'link',
                    value: function link(scope, elem, attrs, ctrl) {
                        var groupedBarChart = function () {
                            function groupedBarChart(opts) {
                                var _this3 = this;

                                _classCallCheck(this, groupedBarChart);

                                this.data = opts.data;
                                this.margin = opts.margin;
                                this.width = opts.width;
                                this.height = opts.height;
                                this.showLegend = opts.legend;
                                this.element = elem.find(opts.element)[0];
                                this.options = [];
                                this.data.forEach(function (d) {
                                    _this3.options = _.union(_this3.options, _.keys(d).filter(function (k) {
                                        return k !== 'label' && k !== 'valores';
                                    }));
                                });
                                this.data.forEach(function (d) {
                                    d.valores = _this3.options.map(function (name) {
                                        return { name: name, value: d[name] || 0 };
                                    });
                                });
                                if (opts.color.length == 0) {
                                    this.color = d3.scale.ordinal().range(d3.scale.category20().range());
                                } else {
                                    this.color = d3.scale.ordinal().range(opts.color);
                                }

                                this.draw();
                            }

                            _createClass(groupedBarChart, [{
                                key: 'draw',
                                value: function draw() {
                                    d3.select(this.element).html("");
                                    this.svg = d3.select(this.element).append('svg');
                                    this.svg.attr('width', this.width + this.margin.left + this.margin.right).attr("height", this.height + this.margin.top + this.margin.bottom).append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

                                    this.createScales();
                                    this.addAxes();
                                    this.addTooltips();
                                    this.addBar();
                                    if (this.showLegend) this.addLegend();
                                }
                            }, {
                                key: 'createScales',
                                value: function createScales() {
                                    this.x0 = d3.scale.ordinal().rangeRoundBands([0, this.width], .5);

                                    this.x1 = d3.scale.ordinal();

                                    this.y = d3.scale.linear().range([this.height, 0]);
                                }
                            }, {
                                key: 'addAxes',
                                value: function addAxes() {
                                    this.xAxis = d3.svg.axis().scale(this.x0).tickSize(0).orient("bottom");

                                    this.yAxis = d3.svg.axis().scale(this.y).orient("left");

                                    this.x0.domain(this.data.map(function (d) {
                                        return d.label;
                                    }));
                                    this.x1.domain(this.options).rangeRoundBands([0, this.x0.rangeBand()]);
                                    this.y.domain([0, d3.max(this.data, function (d) {
                                        return d3.max(d.valores, function (d) {
                                            return d.value;
                                        });
                                    })]);

                                    this.svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + this.height + ")").call(this.xAxis);

                                    this.svg.append("g").attr("class", "y axis").style('opacity', '0').call(this.yAxis).append("text").attr("transform", "rotate(-90)").attr("y", 6).attr("dy", ".71em").style("text-anchor", "end").style('font-weight', 'bold').text("Value");
                                }
                            }, {
                                key: 'addBar',
                                value: function addBar() {
                                    var _this4 = this;

                                    var self = this;
                                    this.bar = this.svg.selectAll('.bar').data(this.data).enter().append('g').attr('class', 'g').attr('transform', function (d) {
                                        return 'translate(' + _this4.x0(d.label) + ', 0)';
                                    });

                                    this.barC = this.bar.selectAll('rect').data(function (d) {
                                        return d.valores;
                                    }).enter();

                                    this.barC.append('rect').attr('width', this.x1.rangeBand()).attr('x', function (d) {
                                        return _this4.x1(d.name);
                                    }).attr('y', function (d) {
                                        return _this4.y(d.value);
                                    }).attr('height', function (d) {
                                        return _this4.height - _this4.y(d.value);
                                    }).style('fill', function (d) {
                                        return _this4.color(d.name);
                                    }).on("mouseover", function (d) {
                                        var color = self.color(d.name);
                                        d3.select(this).style("fill", d3.rgb(color).darker(2));
                                        self.tooltip.style('opacity', 0.9).style('left', event.pageX - 34 + 'px').style('top', event.pageY - 12 + 'px').html('<strong>' + d.name + ':</strong><span style=\'color:red\'> ' + d.value + '</span>');
                                    }).on("mouseout", function (d) {
                                        d3.select(this).style("fill", self.color(d.name));
                                        self.tooltip.style('opacity', 0);
                                    });
                                }
                            }, {
                                key: 'addLegend',
                                value: function addLegend() {
                                    this.legend = this.svg.selectAll('.legend').data(this.options.slice()).enter().append('g').attr('class', 'legend').attr('transform', function (d, i) {
                                        return 'translate(0,' + i * 20 + ')';
                                    });

                                    this.legend.append('rect').attr('x', this.width * 1.1 - 18).attr('width', 18).attr('height', 18).style('fill', this.color);

                                    this.legend.append('text').attr('x', this.width * 1.1 - 24).attr('y', 9).attr('dy', '.35em').style('text-anchor', 'end').text(function (d) {
                                        return d;
                                    });

                                    this.legend.transition().duration(500).delay(function (d, i) {
                                        return 1300 + 100 * i;
                                    }).style("opacity", "1");
                                }
                            }, {
                                key: 'addTooltips',
                                value: function addTooltips() {
                                    this.tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);
                                }
                            }]);

                            return groupedBarChart;
                        }();

                        function onRender() {
                            if (!ctrl.data) return;

                            var Chart = new groupedBarChart({
                                data: ctrl.data,
                                margin: { top: 10, left: 10, bottom: 10, right: 10 },
                                element: '#chart',
                                width: ctrl.panel.width,
                                height: ctrl.panel.height,
                                legend: ctrl.panel.legend.show,
                                color: ctrl.panel.colorSch
                            });

                            ctrl.panel.colorSet = [];
                            Chart.options.forEach(function (d) {
                                ctrl.panel.colorSet.push({ text: d, color: Chart.color(d) });
                            });
                        }

                        this.events.on('render', function () {
                            onRender();
                        });
                    }
                }]);

                return GroupedBarChartCtrl;
            }(MetricsPanelCtrl));

            _export('GroupedBarChartCtrl', GroupedBarChartCtrl);

            GroupedBarChartCtrl.templateUrl = 'partials/module.html';
        }
    };
});
//# sourceMappingURL=ctrl.js.map
