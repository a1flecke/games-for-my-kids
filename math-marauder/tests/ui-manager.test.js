const assert = require('assert');
const UIManager = require('../js/ui.js');

class FakeClassList {
    constructor() {
        this._items = new Set();
    }

    add(name) {
        this._items.add(name);
    }

    remove(...names) {
        names.forEach((name) => this._items.delete(name));
    }

    contains(name) {
        return this._items.has(name);
    }

    toggle(name, force) {
        const shouldAdd = force === undefined ? !this.contains(name) : !!force;
        if (shouldAdd) this.add(name);
        else this.remove(name);
    }
}

class FakeElement {
    constructor(doc, id, tagName) {
        this.ownerDocument = doc;
        this.id = id;
        this.tagName = tagName || 'div';
        this.textContent = '';
        this.disabled = false;
        this.onclick = null;
        this.attributes = {};
        this.dataset = {};
        this.classList = new FakeClassList();
        this.children = [];
        this._listeners = {};
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name];
    }

    focus() {
        this.ownerDocument.activeElement = this;
    }

    click() {
        if (!this.disabled && this.onclick) this.onclick();
        (this._listeners.click || []).forEach((handler) => handler());
    }

    addEventListener(type, handler) {
        this._listeners[type] = this._listeners[type] || [];
        this._listeners[type].push(handler);
    }

    querySelectorAll(selector) {
        if (selector.includes('button')) {
            return this.children.filter((child) => child.tagName === 'button' && child.attributes.tabindex !== '-1');
        }
        return [];
    }
}

class FakeDocument {
    constructor() {
        this._elements = {};
        this.activeElement = null;
        this.documentElement = new FakeElement(this, 'html');
        this._listeners = {};
    }

    addElement(id, tagName, classes) {
        const el = new FakeElement(this, id, tagName);
        (classes || []).forEach((name) => el.classList.add(name));
        this._elements[id] = el;
        return el;
    }

    getElementById(id) {
        return this._elements[id] || null;
    }

    querySelectorAll(selector) {
        const values = Object.values(this._elements);
        if (selector === '.screen') return values.filter((el) => el.classList.contains('screen'));
        if (selector === '.answer-button') return values.filter((el) => el.classList.contains('answer-button'));
        return [];
    }

    addEventListener(type, handler) {
        this._listeners[type] = this._listeners[type] || [];
        this._listeners[type].push(handler);
    }

    dispatchKey(key, extra) {
        const event = Object.assign({
            key,
            shiftKey: false,
            preventDefault() {
                this.defaultPrevented = true;
            }
        }, extra || {});
        (this._listeners.keydown || []).forEach((handler) => handler(event));
        return event;
    }
}

function makeDocument() {
    const doc = new FakeDocument();
    doc.addElement('btn-settings', 'button').setAttribute('aria-expanded', 'false');
    const settings = doc.addElement('settings-overlay', 'div', ['overlay']);
    const settingsClose = doc.addElement('btn-close-settings', 'button');
    settings.children.push(settingsClose, doc.addElement('setting-reduced-motion', 'input'));
    const dialogue = doc.addElement('dialogue-overlay', 'div', ['overlay']);
    const dialogueClose = doc.addElement('btn-close-dialogue', 'button');
    dialogue.children.push(dialogueClose, doc.addElement('btn-replay-dialogue', 'button'));
    doc.addElement('dialogue-speaker');
    doc.addElement('dialogue-caption');
    doc.addElement('math-prompt');
    doc.addElement('battle-status');
    for (let i = 0; i < 4; i += 1) {
        doc.addElement(`answer-${i}`, 'button', ['answer-button']);
    }
    return doc;
}

{
    const doc = makeDocument();
    const ui = new UIManager(doc);
    const titleButton = doc.getElementById('btn-settings');
    const answerButton = doc.getElementById('answer-0');
    titleButton.focus();
    ui.showDialogue({ speaker: 'Guide', caption: 'Pick the matching rune.', voiceText: 'Pick the matching rune.' }, null, answerButton);
    assert.strictEqual(doc.activeElement.id, 'btn-close-dialogue');
    doc.dispatchKey('Escape');
    assert.strictEqual(doc.getElementById('dialogue-overlay').getAttribute('aria-hidden'), 'true');
    assert.strictEqual(doc.activeElement.id, 'answer-0');
}

{
    const doc = makeDocument();
    const ui = new UIManager(doc);
    let calls = 0;
    ui.setAnswers([12, 24, 36, 48], () => { calls += 1; });
    doc.getElementById('answer-0').click();
    doc.getElementById('answer-0').click();
    assert.strictEqual(calls, 1);
    assert.strictEqual(doc.getElementById('answer-1').disabled, true);
}
