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
import { Totals } from "./totals.js"

export class Item {
    constructor(key, name, row, category) {
        this.key = key
        this.name = name
        this.row = row
        this.category = category
        this.recipes = []
        this.uses = []

        this.ignoreRecipe = null
        this.disableRecipe = null
    }
    addRecipe(recipe) {
        this.recipes.push(recipe)
    }
    addUse(recipe) {
        this.uses.push(recipe)
    }
    produce(spec, rate, ignore) {
        let totals = new Totals()
        let recipe = spec.getRecipe(this)
        let gives = recipe.gives(this)
        rate = rate.div(gives)
        totals.add(recipe, rate)
        totals.updateHeight(recipe, 0)
        if (ignore.has(recipe)) {
            return totals
        }
        for (let ing of recipe.ingredients) {
            let subtotals = ing.item.produce(spec, rate.mul(ing.amount), ignore)
            totals.combine(subtotals)
        }
        return totals
    }
    iconPath() {
        return "images/" + this.name + ".png"
    }
}

export function getItems(data) {
    let items = new Map()
    for (let d of data.items) {
        items.set(d.key, new Item(d.key, d.name, d.row, d.category))
    }
    return items
}
