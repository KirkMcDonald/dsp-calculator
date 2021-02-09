/*Copyright 2021 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
import { toggleIgnoreHandler } from "./events.js"
import { spec } from "./factory.js"
import { getRecipeGroups } from "./groups.js"
import { Rational, zero, one } from "./rational.js"

class Header {
    constructor(text, colspan, surplus) {
        this.text = text
        this.colspan = colspan
        this.surplus = surplus
    }
}

function setlen(a, len, callback) {
    if (a.length > len) {
        a.length = len
    }
    while (a.length < len) {
        a.push(callback())
    }
}

class BreakdownRow {
    constructor(item, destRecipe, rate, building, divider) {
        this.item = item
        this.recipe = destRecipe
        this.rate = rate
        this.building = building
        this.divider = divider
    }
}

function getBreakdown(item, totals) {
    let rows = []
    let uses = []
    let found = false
    for (let recipe of item.recipes) {
        if (!totals.rates.has(recipe)) {
            continue
        }
        for (let ing of recipe.ingredients) {
            let rate = totals.consumers.get(ing.item).get(recipe)
            rows.push(new BreakdownRow(ing.item, recipe, rate, false))
            found = true
        }
    }
    for (let [recipe, rate] of totals.consumers.get(item)) {
        if (recipe.isReal()) {
            let building = spec.getBuilding(recipe)
            rows.push(new BreakdownRow(item, recipe, rate, building, found))
            found = false
        }
    }
    return rows
}

class DisplayRow {
    constructor() {
    }
    setData(item, recipe, single) {
    }
}

class DisplayGroup {
    constructor() {
        this.rows = []
    }
    setData(totals, items, recipes) {
        items = [...items]
        recipes = [...recipes]
        if (items.length === 0) {
            this.rows.length = 0
            return
        }
        let len = Math.max(items.length, recipes.length)
        setlen(this.rows, len, () => {return {}})
        for (let i = 0; i < len; i++) {
            let item = items[i] || null
            let recipe = recipes[i] || null
            let building = null
            if (recipe !== null) {
                building = spec.getBuilding(recipe)
            }
            let single = item !== null && recipe !== null && item.name === recipe.name
            let breakdown = null
            if (item !== null) {
                breakdown = getBreakdown(item, totals)
            }
            Object.assign(this.rows[i], {item, recipe, building, single, breakdown})
        }
    }
}

// Remember these values from update to update, to make it simpler to reuse
// elements.
let displayGroups = []

function getDisplayGroups(totals) {
    let groupObjects = getRecipeGroups(new Set(totals.rates.keys()))
    setlen(displayGroups, groupObjects.size, () => new DisplayGroup())
    let i = 0
    for (let group of groupObjects) {
        let items = new Set()
        for (let recipe of group) {
            for (let ing of recipe.products) {
                if (totals.items.has(ing.item)) {
                    items.add(ing.item)
                }
            }
        }
        displayGroups[i++].setData(totals, items, group)
    }
}

function toggleBreakdownHandler() {
    let row = this.parentNode
    let bdRow = row.nextSibling
    if (row.classList.contains("breakdown-open")) {
        row.classList.remove("breakdown-open")
        bdRow.classList.remove("breakdown-open")
    } else {
        row.classList.add("breakdown-open")
        bdRow.classList.add("breakdown-open")
    }
}

export function displayItems(spec, totals) {
    let headers = [
        new Header("", 1),
        new Header("items/" + spec.format.rateName, 2),
        new Header("surplus/" + spec.format.rateName, 1, true),
        new Header("belts", 2),
        new Header("buildings", 2),
        new Header("power", 1),
    ]
    let totalCols = 0
    for (let header of headers) {
        totalCols += header.colspan
    }

    let table = d3.select("table#totals")
        table.classed("nosurplus", totals.surplus.size === 0)
    let footerRow = table.selectAll("tfoot tr")
    footerRow.select("td.power-label")
        .attr("colspan", totalCols - 1)

    let headerRow = table.selectAll("thead tr").selectAll("th")
        .data(headers)
    headerRow.exit().remove()
    headerRow.join("th")
        .classed("surplus", d => d.surplus)
        .text(d => d.text)
        .attr("colspan", d => d.colspan)

    getDisplayGroups(totals)
    let rowGroup = table.selectAll("tbody")
        .data(displayGroups)
        .join("tbody")
    rowGroup.selectAll("tr.breakdown").remove()
    // Create new rows.
    let row = rowGroup.selectAll("tr")
        .data(d => d.rows)
        .join(enter => {
            let row = enter.append("tr")
            row.append("td")
                .classed("item", true)
                .on("click", toggleBreakdownHandler)
                .append("svg")
                    .classed("breakdown-arrow", true)
                    .attr("viewBox", "0 0 16 16")
                    .attr("width", 16)
                    .attr("height", 16)
                    .append("use")
                        .attr("href", "images/icons.svg#right")
            row.append("td")
                .classed("item", true)
                .append("img")
                    .classed("icon item-icon", true)
                    .attr("width", 32)
                    .attr("height", 32)
                    .on("click", toggleIgnoreHandler)
            row.append("td")
                .classed("item right-align", true)
                .append("tt")
                    .classed("item-rate", true)
            row.append("td")
                .classed("item surplus right-align", true)
                .append("tt")
                    .classed("surplus-rate", true)
            let beltCell = row.append("td")
                .classed("item pad", true)
            beltCell.append("img")
                .classed("icon belt-icon", true)
                .attr("width", 32)
                .attr("height", 32)
            beltCell.append(d => new Text(" \u00d7"))
            row.append("td")
                .classed("item right-align", true)
                .append("tt")
                    .classed("belt-count", true)

            let buildingCell = row.append("td")
                .classed("pad building building-icon right-align", true)
            row.append("td")
                .classed("right-align building", true)
                .append("tt")
                    .classed("building-count", true)
            return row
        })
        .classed("nobuilding", d => d.building === null)
        .classed("noitem", d => d.item === null)
    // Update row data.
    let itemRow = row.filter(d => d.item !== null)
    itemRow.selectAll("img.item-icon")
        .classed("ignore", d => spec.ignore.has(d.item))
        .attr("src", d => d.item.icon.path())
        .attr("title", d => d.item.name)
    itemRow.selectAll("tt.item-rate")
        .text(d => {
            let rate = totals.items.get(d.item)
            if (totals.surplus.has(d.item)) {
                rate = rate.sub(totals.surplus.get(d.item))
            }
            return spec.format.alignRate(rate)
        })
    itemRow.selectAll("tt.surplus-rate")
        .text(d => spec.format.alignRate(totals.surplus.has(d.item) ? totals.surplus.get(d.item) : zero))
    itemRow.selectAll("img.belt-icon")
        .attr("src", spec.belt.icon.path())
        .attr("title", spec.belt.name)
    itemRow.selectAll("tt.belt-count")
        .text(d => spec.format.alignCount(spec.getBeltCount(totals.items.get(d.item))))
    let buildingRow = row.filter(d => d.building !== null)
    let buildingCell = buildingRow.selectAll("td.building-icon")
    buildingCell.selectAll("*").remove()
    let buildingExtra = buildingCell.filter(d => !d.single)
    buildingExtra.append(d => d.recipe.icon.make(32))
    buildingExtra.append("span")
        .text(":")
    buildingCell.append(d => d.building.icon.make(32))
    buildingCell.append("span")
        .text(" \u00d7")
    buildingRow.selectAll("tt.building-count")
        .text(d => spec.format.alignCount(spec.getCount(d.recipe, totals.rates.get(d.recipe))))

    // Render breakdowns.
    itemRow = row.filter(d => d.breakdown !== null)
    let breakdown = itemRow.select(function () {
        let row = document.createElement("tr")
        this.parentNode.insertBefore(row, this.nextSibling)
        return row
    })
        .classed("breakdown", true)
        .classed("breakdown-open", function() { return this.previousSibling.classList.contains("breakdown-open") })
    breakdown.append("td")
    row = breakdown.append("td")
        .attr("colspan", totalCols - 1)
        .append("table")
            .selectAll("tr")
            .data(d => d.breakdown)
            .join("tr")
                .classed("breakdown-first-output", d => d.divider)
    let bdIcons = row.append("td")
    bdIcons.append(d => d.item.icon.make(32))
        .classed("item-icon", true)
    bdIcons.append("svg")
        .classed("usage-arrow", true)
        .attr("viewBox", "0 0 18 16")
        .attr("width", 18)
        .attr("height", 16)
        .append("use")
            .attr("href", "images/icons.svg#rightarrow")
    bdIcons.append(d => d.recipe.icon.make(32))
        .classed("item-icon", true)
    row.append("td")
        .classed("right-align", true)
        .append("tt")
            .classed("item-rate", true)
            .text(d => spec.format.alignRate(d.rate))
    table.select("tfoot").raise()
}
