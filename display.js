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

/*function changeOverclock(d) {
    let hundred = Rational.from_float(100)
    let twoFifty = Rational.from_float(250)
    let x = Rational.from_string(this.value).floor()
    if (x.less(one)) {
        x = one
    }
    if (twoFifty.less(x)) {
        x = twoFifty
    }
    x = x.div(hundred)
    spec.setOverclock(d.recipe, x)
    spec.updateSolution()
}*/

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

let displayGroups = []

function getDisplayGroups(totals) {
    let groups = new Map()
    for (let [recipe, rate] of totals.rates) {
        if (recipe.products.length > 0) {
            groups.set(recipe, new Set([recipe]))
        }
    }
    for (let [item, rate] of totals.items) {
        let recipes = []
        for (let recipe of item.recipes) {
            if (totals.rates.has(recipe)) {
                recipes.push(recipe)
            }
        }
        if (recipes.length > 1) {
            let combined = new Set()
            for (let recipe of recipes) {
                for (let r of groups.get(recipe)) {
                    combined.add(r)
                }
            }
            for (let recipe of combined) {
                groups.set(recipe, combined)
            }
        }
    }
    let groupObjects = new Set()
    for (let [r, group] of groups) {
        groupObjects.add(group)
    }
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

// Remember these values from update to update, to make it simpler to reuse
// elements.
//let displayedItems = []

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
        //new Header("overclock", 1),
        new Header("power", 1),
    ]
    let totalCols = 0
    for (let header of headers) {
        totalCols += header.colspan
    }
    /*displayedItems = displayedItems.slice(0, totals.topo.length)
    while (displayedItems.length < totals.topo.length) {
        displayedItems.push({})
    }
    let totalAveragePower = zero
    let totalPeakPower = zero
    for (let i = 0; i < totals.topo.length; i++) {
        let recipe = totals.topo[i]
        let display = displayedItems[i]
        let rate = totals.rates.get(recipe)
        let item = recipe.product.item
        let itemRate = rate.mul(recipe.gives(item))
        let overclock = spec.getOverclock(recipe)
        let overclockString = overclock.mul(Rational.from_float(100)).toString()
        let {average, peak} = spec.getPowerUsage(recipe, rate, totals.topo.length)
        totalAveragePower = totalAveragePower.add(average)
        totalPeakPower = totalPeakPower.add(peak)
        display.item = item
        display.itemRate = itemRate
        display.recipe = recipe
        display.ignore = ignore.has(recipe)
        display.rate = rate
        display.building = spec.getBuilding(recipe)
        display.count = spec.getCount(recipe, rate)
        display.overclock = overclockString
        display.average = average
        display.peak = peak
    }*/

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

    //let groups = getDisplayGroups(totals)
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
            /*buildingCell.append("img")
                .classed("icon building-icon", true)
                .attr("width", 32)
                .attr("height", 32)
            buildingCell.append(d => new Text(" \u00d7"))*/
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
        .attr("src", d => d.item.iconPath())
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
        .attr("src", spec.belt.iconPath())
        .attr("title", spec.belt.name)
    itemRow.selectAll("tt.belt-count")
        .text(d => spec.format.alignCount(spec.getBeltCount(totals.items.get(d.item))))
    let buildingRow = row.filter(d => d.building !== null)
    let buildingCell = buildingRow.selectAll("td.building-icon")
    buildingCell.selectAll("*").remove()
    let buildingExtra = buildingCell.filter(d => !d.single)
    buildingExtra.append("img")
        .classed("icon", true)
        .attr("width", 32)
        .attr("height", 32)
        .attr("src", d => d.recipe.iconPath())
    buildingExtra.append("span")
        .text(":")
    buildingCell.append("img")
        .classed("icon", true)
        .attr("width", 32)
        .attr("height", 32)
        .attr("src", d => d.building.iconPath())
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
    bdIcons.append("img")
        .classed("icon item-icon", true)
        .attr("width", 32)
        .attr("height", 32)
        .attr("src", d => d.item.iconPath())
    bdIcons.append("svg")
        .classed("usage-arrow", true)
        .attr("viewBox", "0 0 18 16")
        .attr("width", 18)
        .attr("height", 16)
        .append("use")
            .attr("href", "images/icons.svg#rightarrow")
    bdIcons.append("img")
        .classed("icon item-icon", true)
        .attr("width", 32)
        .attr("height", 32)
        .attr("src", d => d.recipe.iconPath())
    row.append("td")
        .classed("right-align", true)
        .append("tt")
            .classed("item-rate", true)
            .text(d => spec.format.alignRate(d.rate))
    table.select("tfoot").raise()
}
/*
    // create missing rows
    let rows = table.selectAll("tbody").selectAll("tr")
        .data(displayedItems)
    rows.exit().remove()
    row = rows.enter()
        .append("tr")
            .classed("display-row", true)
    // items/m
    row.append("td")
        .append("img")
            .classed("icon item-icon", true)
            .attr("width", 32)
            .attr("height", 32)
            .on("click", toggleIgnoreHandler)
    row.append("td")
        .classed("right-align", true)
        .append("tt")
            .classed("item-rate", true)
    // belts
    beltCell = row.append("td")
        .classed("pad", true)
    beltCell.append("img")
        .classed("icon belt-icon", true)
        .attr("width", 32)
        .attr("height", 32)
    beltCell.append(d => new Text(" \u00d7"))
    row.append("td")
        .classed("right-align", true)
        .append("tt")
            .classed("belt-count", true)
    // buildings
    buildingCell = row.append("td")
        .classed("pad building", true)
    buildingCell.append("img")
        .classed("icon building-icon", true)
        .attr("width", 32)
        .attr("height", 32)
    buildingCell.append(d => new Text(" \u00d7"))
    row.append("td")
        .classed("right-align building", true)
        .append("tt")
            .classed("building-count", true)
    /*
    row.filter(d => d.building === null)
        .append("td")
            .attr("colspan", 4)
    */
    /*// overclock
    let overclockCell = row.append("td")
        .classed("pad building", true)
    overclockCell.append("input")
        .classed("overclock", true)
        .attr("type", "number")
        .attr("title", "")
        .attr("min", 1)
        .attr("max", 250)
        .on("input", changeOverclock)
    overclockCell.append(() => new Text("%"))*
    // power
    row.append("td")
        .classed("right-align pad building", true)
        .append("tt")
            .classed("power", true)

    // update rows
    row = table.select("tbody").selectAll("tr")
        .classed("nobuilding", d => d.building === null)
    row.selectAll("img.item-icon")
        .classed("ignore", d => d.ignore)
        .attr("src", d => d.item.iconPath())
        .attr("title", d => d.item.name)
    row.selectAll("tt.item-rate")
        .text(d => spec.format.alignRate(d.itemRate))
    row.selectAll("img.belt-icon")
        .attr("src", spec.belt.iconPath())
        .attr("title", spec.belt.name)
    row.selectAll("tt.belt-count")
        .text(d => spec.format.alignCount(spec.getBeltCount(d.itemRate)))
    let buildingRow = row.filter(d => d.building !== null)
    buildingRow.selectAll("img.building-icon")
        .attr("src", d => d.building.iconPath())
        .attr("title", d => d.building.name)
    buildingRow.selectAll("tt.building-count")
        .text(d => spec.format.alignCount(d.count))
    /*buildingRow.selectAll("input.overclock")
        .attr("value", d => d.overclock)*
    buildingRow.selectAll("tt.power")
        .text(d => spec.format.alignCount(d.average) + " MW")

    let totalPower = [totalAveragePower, totalPeakPower]
    /*let footerRow = table.selectAll("tfoot tr")
    footerRow.select("td.power-label")
        .attr("colspan", totalCols - 1)
    footerRow.select("tt")
        .data(totalPower)
        .text(d => spec.format.alignCount(d) + " MW")*
}*/
