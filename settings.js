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
import { DEFAULT_RATE, DEFAULT_RATE_PRECISION, DEFAULT_COUNT_PRECISION, longRateNames } from "./align.js"
import { dropdown } from "./dropdown.js"
import { DEFAULT_TAB, clickTab } from "./events.js"
import { spec, /*resourcePurities,*/ /*DEFAULT_BELT*/ } from "./factory.js"
import { Rational } from "./rational.js"

// There are several things going on with this control flow. Settings should
// work like this:
// 1) Settings are parsed from the URL fragment into the settings Map.
// 2) Each setting's `render` function is called.
// 3) If the setting is not present in the map, a default value is used.
// 4) The setting is applied.
// 5) The setting's GUI is placed into a consistent state.
// Remember to add the setting to fragment.js, too!

// tab

function renderTab(settings) {
    let tabName = DEFAULT_TAB
    if (settings.has("tab")) {
        tabName = settings.get("tab")
    }
    clickTab(tabName)
}

// build targets

function renderTargets(settings) {
    spec.buildTargets = []
    d3.select("#targets li.target").remove()

    let targetSetting = settings.get("items")
    if (targetSetting !== undefined && targetSetting !== "") {
        let targets = targetSetting.split(",")
        for (let targetString of targets) {
            let parts = targetString.split(":")
            let itemKey = parts[0]
            let target = spec.addTarget(itemKey)
            let type = parts[1]
            if (type === "f") {
                target.setBuildings(parts[2])
            } else if (type === "r") {
                target.setRate(parts[2])
            } else {
                throw new Error("unknown target type")
            }
        }
    } else {
        spec.addTarget()
    }
}

// ignore

function renderIgnore(settings) {
    spec.ignore.clear()
    // UI will be rendered later, as part of the solution.
    let ignoreSetting = settings.get("ignore")
    if (ignoreSetting !== undefined && ignoreSetting !== "") {
        let ignore = ignoreSetting.split(",")
        for (let recipeKey of ignore) {
            let recipe = spec.recipes.get(recipeKey)
            spec.ignore.add(recipe)
        }
    }
}

// display rate

function rateHandler() {
    spec.format.setDisplayRate(this.value)
    spec.updateSolution()
}

function renderRateOptions(settings) {
    let rateName = DEFAULT_RATE
    if (settings.has("rate")) {
        rateName = settings.get("rate")
    }
    spec.format.setDisplayRate(rateName)
    let rates = []
    for (let [rateName, longRateName] of longRateNames) {
        rates.push({rateName, longRateName})
    }
    let form = d3.select("#display_rate")
    form.selectAll("*").remove()
    let rateOption = form.selectAll("span")
        .data(rates)
        .join("span")
    rateOption.append("input")
        .attr("id", d => d.rateName + "_rate")
        .attr("type", "radio")
        .attr("name", "rate")
        .attr("value", d => d.rateName)
        .attr("checked", d => d.rateName === rateName ? "" : null)
        .on("change", rateHandler)
    rateOption.append("label")
        .attr("for", d => d.rateName + "_rate")
        .text(d => "items/" + d.longRateName)
    rateOption.append("br")
}

// precisions

function renderPrecisions(settings) {
    spec.format.ratePrecision = DEFAULT_RATE_PRECISION
    if (settings.has("rp")) {
        spec.format.ratePrecision = Number(settings.get("rp"))
    }
    d3.select("#rprec").attr("value", spec.format.ratePrecision)
    spec.format.countPrecision = DEFAULT_COUNT_PRECISION
    if (settings.has("cp")) {
        spec.format.countPrecision = Number(settings.get("cp"))
    }
    d3.select("#cprec").attr("value", spec.format.countPrecision)
}

// belt

function beltHandler(event, belt) {
    spec.belt = belt
    spec.updateSolution()
}

function renderBelts(settings) {
    let beltKey = spec.belts.keys().next().value
    if (settings.has("belt")) {
        beltKey = settings.get("belt")
    }
    spec.belt = spec.belts.get(beltKey)

    let belts = []
    for (let [beltKey, belt] of spec.belts) {
        belts.push(belt)
    }
    let form = d3.select("#belt_selector")
    form.selectAll("*").remove()
    let beltOption = form.selectAll("span")
        .data(belts)
        .join("span")
    beltOption.append("input")
        .attr("id", d => "belt." + d.key)
        .attr("type", "radio")
        .attr("name", "belt")
        .attr("value", d => d.key)
        .attr("checked", d => d === spec.belt ? "" : null)
        .on("change", beltHandler)
    beltOption.append("label")
        .attr("for", d => "belt." + d.key)
        .append("img")
            .classed("icon", true)
            .attr("src", d => d.iconPath())
            .attr("width", 32)
            .attr("height", 32)
            .attr("title", d => d.name)
}

// recipe disabling

function renderRecipes(settings) {
    let div = d3.select("#recipe_toggles")
    div.selectAll("*").remove()
}

// resource priority

function renderResourcePriorities(settings) {
    if (settings.has("priority")) {
        let tiers = []
        let keys = settings.get("priority").split(";")
        for (let s of keys) {
            tiers.push(s.split(","))
        }
        spec.setPriorities(tiers)
    } else {
        spec.setDefaultPriority()
    }
    let dragitem = null
    let dragElement = null

    let div = d3.select("#resource_settings")
    div.selectAll("*").remove()

    function dropTargetBoilerplate(s, drop) {
        s.on("dragover", function(event, d) {
            event.preventDefault()
        })
        s.on("dragenter", function(event, d) {
            this.classList.add("highlight")
        })
        s.on("dragleave", function(event, d) {
            if (event.target === this) {
                this.classList.remove("highlight")
            }
        })
        s.on("drop", function(event, d) {
            if (dragitem === null) {
                return
            }
            event.preventDefault()
            this.classList.remove("highlight")
            drop.call(this, event, d)
            dragitem = null
            dragElement = null
            spec.updateSolution()
        })
    }

    function removeTier(tier) {
        let oldMiddle = tier.previousSibling
        if (oldMiddle.classList.contains("middle")) {
            d3.select(oldMiddle).remove()
        } else {
            d3.select(tier.nextSibling).remove()
        }
        d3.select(tier).remove()
    }

    function makeTier(p) {
        let tier = d3.create("div")
            .datum(p)
            .classed("resource-tier", true)
        dropTargetBoilerplate(tier, function(event, d) {
            if (dragElement.parentNode !== this) {
                let remove = spec.setPriority(dragitem, d)
                let oldTier = dragElement.parentNode
                this.appendChild(dragElement)
                if (remove) {
                    removeTier(oldTier)
                }
            }
        })
        let resource = tier.selectAll("div")
            .data(d => d.getRecipeArray())
            .join("div")
        resource.classed("resource", true)
            //.attr("draggable", "true")
            .on("dragstart", function(event, d) {
                div.classed("dragging", true)
                dragitem = d
                dragElement = this
            })
            .on("dragend", function(event, d) {
                div.classed("dragging", false)
            })
        resource.append("img")
            .classed("icon", true)
            .attr("src", d => d.iconPath())
            .attr("width", 48)
            .attr("height", 48)
            .attr("title", d => d.name)
        return tier.node()
    }

    function makeMiddle(p) {
        let middle = d3.create("div")
            .datum(p)
            .classed("middle", true)
        dropTargetBoilerplate(middle, function(event, d) {
            let p = spec.addPriorityBefore(d)
            let oldTier = dragElement.parentNode
            div.node().insertBefore(makeMiddle(p), this)
            let newTier = makeTier(p)
            div.node().insertBefore(newTier, this)
            let remove = spec.setPriority(dragitem, p)
            newTier.appendChild(dragElement)
            if (remove) {
                removeTier(oldTier)
            }
        })
        return middle.node()
    }

    let less = div.append("div")
        .classed("resource-tier bookend", true)
    dropTargetBoilerplate(less, function(event, d) {
        let first = spec.priority[0]
        let firstTier = this.nextSibling
        let p = spec.addPriorityBefore(first)
        let oldTier = dragElement.parentNode
        let newTier = makeTier(p)
        div.node().insertBefore(newTier, firstTier)
        div.node().insertBefore(makeMiddle(first), firstTier)
        let remove = spec.setPriority(dragitem, p)
        newTier.appendChild(dragElement)
        if (remove) {
            removeTier(oldTier)
        }
    })
    less.append("span")
        .text("less valuable")
    let first = true
    for (let p of spec.priority) {
        if (!first) {
            div.append(() => makeMiddle(p))
        }
        first = false
        div.append(() => makeTier(p))
    }
    let more = div.append("div")
        .classed("resource-tier bookend", true)
    dropTargetBoilerplate(more, function(event, d) {
        let p = spec.addPriorityBefore(null)
        let oldTier = dragElement.parentNode
        div.node().insertBefore(makeMiddle(p), this)
        let newTier = makeTier(p)
        div.node().insertBefore(newTier, this)
        let remove = spec.setPriority(dragitem, p)
        newTier.appendChild(dragElement)
        if (remove) {
            removeTier(oldTier)
        }
    })
    more.append("span")
        .text("more valuable")
}

export function renderSettings(settings) {
    renderTargets(settings)
    renderIgnore(settings)
    renderRateOptions(settings)
    renderPrecisions(settings)
    renderBelts(settings)
    renderRecipes(settings)
    renderResourcePriorities(settings)
    renderTab(settings)
}
