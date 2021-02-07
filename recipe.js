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
import { Rational, zero, one } from "./rational.js"

export class Ingredient {
    constructor(item, amount) {
        this.item = item
        this.amount = amount
    }
}

class Recipe {
    constructor(key, name, category, time, ingredients, products) {
        this.key = key
        this.name = name
        this.category = category
        this.time = time
        this.ingredients = ingredients
        for (let ing of ingredients) {
            ing.item.addUse(this)
        }
        this.products = products
        for (let ing of products) {
            ing.item.addRecipe(this)
        }
    }
    gives(item) {
        for (let ing of this.products) {
            if (ing.item === item) {
                return ing.amount
            }
        }
        return null
    }
    iconPath() {
        return "images/" + this.name + ".png"
    }
    isResource() {
        return false
    }
    isReal() {
        return true
    }
    maxPriority() {
        return false
    }
}

// Pseudo-recipe representing the ex nihilo production of items with all
// recipes disabled.
export class DisabledRecipe extends Recipe {
    constructor(item, max) {
        this.name = item.name
        this.category = null
        this.ingredients = []
        this.products = [new Ingredient(item, one)]
        this.max = max
    }
    maxPriority() {
        return this.max
    }
}

function makeRecipe(data, items, d) {
    let time = Rational.from_float(d.time)
    let ingredients = []
    for (let {name, amount} of d.ingredients) {
        let item = items.get(name)
        ingredients.push(new Ingredient(item, Rational.from_float(amount)))
    }
    let products = []
    for (let {name, amount} of d.products) {
        let item = items.get(name)
        products.push(new Ingredient(item, Rational.from_float(amount)))
    }
    return new Recipe(d.key, d.name, d.category, time, ingredients, products)
}

class ResourceRecipe extends Recipe {
    constructor(key, item, category) {
        super(key, item.name, category, zero, [], [new Ingredient(item, one)])
    }
    isResource() {
        return true
    }
}

export function getRecipes(data, items) {
    let recipes = new Map()
    for (let d of data.resources) {
        let item = items.get(d.item)
        recipes.set(d.key, new ResourceRecipe(d.key, item, d.category))
    }
    for (let d of data.recipes) {
        if (recipes.has(d.key)) {
            throw new Error("repeated recipe key: " + d.key)
        }
        recipes.set(d.key, makeRecipe(data, items, d))
    }
    for (let [itemKey, item] of items) {
        if (item.recipes.length === 0) {
            throw new Error("bad item: " + item.name)
        }
    }
    return recipes
}
