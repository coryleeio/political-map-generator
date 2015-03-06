var MapProc = {
    voronoi: new Voronoi(),
    diagram: null,
    margin: 0.0,
    canvas: null,
    numberOfNodes: 1000,
    bbox: {
        xl: 0,
        xr: 800,
        yt: 0,
        yb: 600
    },
    numberOfPlates: 14,
    plateRootIds: [],
    sites: [],
    numberOfIterations: 2,
    showPlates: true,
    treemap: null,
    voronoiSiteColor: '#0000ff',
    voronoiEdgeColor: '#333',
    voronoiNotHoverColor:'#ffffff',
    voronoiHoverColor: '#f00000',
    voronoiEdgeRecolor: '#444',
    mouseButtonPressed: false,

    init: function() {
        this.canvas = document.getElementById('voronoiCanvas');
        this.randomSites(this.numberOfNodes, true);
        for (var i = 0; i < this.numberOfIterations; i++) {
            this.relaxSites();
        }
        this.treemap = this.buildTreemap();
        this.plateRootIds = this.selectPlateStartingCellIds();
        for(i in this.plateRootIds)
        {   
            if(this.showPlates)
            {
                this.renderCell(this.plateRootIds[i], '#ff0000',this.voronoiEdgeColor);
            }
        }
        this.render();
    },

    clickMouse: function() {
        this.mouseButtonPressed = true;
    },

    unClickMouse: function() {
        this.mouseButtonPressed = false;
    },

    compute: function(sites) {
        this.sites = sites;
        this.voronoi.recycle(this.diagram);
        this.diagram = this.voronoi.compute(sites, this.bbox);
        this.treemap = this.buildTreemap();
    },

    inArray: function(array, value) {
	    for (var i = 0; i < array.length; i++) {
	        if (array[i] == value) return true;
	    }
	    return false;
	},

    selectPlateStartingCellIds: function(numberToSelect) {
    	var arr = [];
    	var i=0;
    	while(i < this.numberOfPlates) {
    		var randomNumber = Math.floor(Math.random() * this.numberOfNodes);
	    	if(!this.inArray(arr, randomNumber))
	    	{
	    		arr.push(randomNumber);
	    		i++;
	    	}
	    }
	    return arr;
    },

    clearSites: function() {
        this.compute([]);
    },

    randomSites: function(n, clear) {
        var sites = [];
        if (!clear) {
            sites = this.sites.slice(0);
        }
        // create vertices
        var xmargin = this.canvas.width * this.margin,
            ymargin = this.canvas.height * this.margin,
            xo = xmargin,
            dx = this.canvas.width - xmargin * 2,
            yo = ymargin,
            dy = this.canvas.height - ymargin * 2;
        for (var i = 0; i < n; i++) {
            sites.push({
                x: self.Math.round((xo + self.Math.random() *
                    dx) * 10) / 10,
                y: self.Math.round((yo + self.Math.random() *
                    dy) * 10) / 10
            });
        }
        this.compute(sites);
    },

    relaxSites: function() {
        if (!this.diagram) {
            return;
        }
        var cells = this.diagram.cells,
            iCell = cells.length,
            cell,
            site, sites = [],
            rn, dist;
        var p = 1 / iCell * 0.1;
        while (iCell--) {
            cell = cells[iCell];
            rn = Math.random();
            // probability of apoptosis
            if (rn < p) {
                continue;
            }
            site = this.cellCentroid(cell);
            dist = this.distance(site, cell.site);
            // don't relax too fast
            if (dist > 2) {
                site.x = (site.x + cell.site.x) / 2;
                site.y = (site.y + cell.site.y) / 2;
            }
            // probability of mytosis
            if (rn > (1 - p)) {
                dist /= 2;
                sites.push({
                    x: site.x + (site.x - cell.site.x) / dist,
                    y: site.y + (site.y - cell.site.y) / dist,
                });
            }
            sites.push(site);
        }
        this.compute(sites);
    },

    distance: function(a, b) {
        var dx = a.x - b.x,
            dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    cellArea: function(cell) {
        var area = 0,
            halfedges = cell.halfedges,
            iHalfedge = halfedges.length,
            halfedge,
            p1, p2;
        while (iHalfedge--) {
            halfedge = halfedges[iHalfedge];
            p1 = halfedge.getStartpoint();
            p2 = halfedge.getEndpoint();
            area += p1.x * p2.y;
            area -= p1.y * p2.x;
        }
        area /= 2;
        return area;
    },

    cellCentroid: function(cell) {
        var x = 0,
            y = 0,
            halfedges = cell.halfedges,
            iHalfedge = halfedges.length,
            halfedge,
            v, p1, p2;
        while (iHalfedge--) {
            halfedge = halfedges[iHalfedge];
            p1 = halfedge.getStartpoint();
            p2 = halfedge.getEndpoint();
            v = p1.x * p2.y - p2.x * p1.y;
            x += (p1.x + p2.x) * v;
            y += (p1.y + p2.y) * v;
        }
        v = this.cellArea(cell) * 6;
        return {
            x: x / v,
            y: y / v
        };
    },

    buildTreemap: function() {
        var treemap = new QuadTree({
            x: this.bbox.xl,
            y: this.bbox.yt,
            width: this.numberOfNodes * 5,
            height: this.numberOfNodes * 5
        });
        var cells = this.diagram.cells,
            iCell = cells.length;
        while (iCell--) {
            bbox = cells[iCell].getBbox();
            bbox.cellid = iCell;
            treemap.insert(bbox);
        }
        return treemap;
    },

    cellUnderMouse: function(ev) {
        if (!this.diagram) {
            return;
        }
        var canvas = document.getElementById('voronoiCanvas');
        if (!canvas) {
            return;
        }
        var x = 0,
            y = 0;
        if (!ev) {
            ev = window.event;
        }

        console.log(ev);
        if (ev.pageX || ev.pageY) {
            x = ev.pageX;
            y = ev.pageY;
        } 
        else if (e.clientX || e.clientY) {
            x = ev.clientX + document.body.scrollLeft + document.documentElement
                .scrollLeft;
            y = ev.clientY + document.body.scrollTop + document.documentElement
                .scrollTop;
        }
        x -= canvas.offsetLeft;
        y -= canvas.offsetTop;
        cellid = this.cellIdFromPoint(x, y);
        if(this.mouseButtonPressed)
        {
            if (this.lastCellId !== cellid) {
                if (this.lastCellId !== undefined) {
                    this.renderCell(this.lastCellId, this.voronoiNotHoverColor, this.voronoiEdgeRecolor);
                }
                if (cellid !== undefined) {
                    this.renderCell(cellid, this.voronoiHoverColor, this.voronoiEdgeColor);
                }
                this.lastCellId = cellid;
            }
        }

        document.getElementById('voronoiCellId').innerHTML = "(" + x + "," + y + ") = " + cellid;
    },

    cellIdFromPoint: function(x, y) {
        // We build the treemap on-demand
        if (this.treemap === null) {
            return;
        }
        // Get the Voronoi cells from the tree map given x,y
        var items = this.treemap.retrieve({
                x: x,
                y: y
            }),
            iItem = items.length,
            cells = this.diagram.cells,
            cell, cellid;
        while (iItem--) {

            cellid = items[iItem].cellid;
            cell = cells[cellid];
            if (cell.pointIntersection(x, y) > 0) {
                return cellid;
            }
        }
        return undefined;
    },

    renderCell: function(id, fillStyle, strokeStyle) {
        if (id === undefined) {
            return;
        }
        if (!this.diagram) {
            return;
        }
        var cell = this.diagram.cells[id];
        if (!cell) {
            return;
        }
        var drawingContext = this.canvas.getContext('2d');
        drawingContext.globalAlpha = 1;
        // edges
        drawingContext.beginPath();
        var halfedges = cell.halfedges,
            nHalfedges = halfedges.length,
            v = halfedges[0].getStartpoint();
        drawingContext.moveTo(v.x, v.y);
        for (var iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            v = halfedges[iHalfedge].getEndpoint();
            drawingContext.lineTo(v.x, v.y);
        }
        drawingContext.fillStyle = fillStyle;
        drawingContext.strokeStyle = strokeStyle;
        drawingContext.fill();
        drawingContext.stroke();
        // site
        v = cell.site;
        drawingContext.fillStyle = this.voronoiSiteColor;
        drawingContext.beginPath();
        drawingContext.rect(v.x - 2 / 3, v.y - 2 / 3, 2, 2);
        drawingContext.fill();
    },

    render: function() {
        var drawingContext = this.canvas.getContext('2d');
        // background
        drawingContext.globalAlpha = 1;
        drawingContext.beginPath();
        drawingContext.rect(0, 0, this.canvas.width, this.canvas.height);
        drawingContext.fillStyle = this.voronoiNotHoverColor;
        drawingContext.fill();
        drawingContext.stokeStyle = this.voronoiEdgeColor;
        drawingContext.stroke();
        // voronoi
    //     if (!this.diagram) {
    //         return;
    //     }
    //     // edges
    //     drawingContext.beginPath();
    //     drawingContext.strokeStyle = this.voronoiEdgeColor;
    //     var edges = this.diagram.edges,
    //         iEdge = edges.length,
    //         edge, v;
    //     while (iEdge--) {
    //         edge = edges[iEdge];
    //         v = edge.va;
    //         drawingContext.moveTo(v.x, v.y);
    //         v = edge.vb;
    //         drawingContext.lineTo(v.x, v.y);
    //     }
    //     drawingContext.stroke();
    //     // sites
    //     drawingContext.beginPath();
    //     drawingContext.fillStyle = this.voronoiSiteColor;
    //     var sites = this.sites,
    //         iSite = sites.length;
    //     while (iSite--) {
    //         v = sites[iSite];
    //         drawingContext.rect(v.x - 2 / 3, v.y - 2 / 3, 2, 2);
    //     }
    //     drawingContext.fill();
    }
};