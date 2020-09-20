
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.25.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    /* src/App.svelte generated by Svelte v3.25.1 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (89:4) {#if items.length > 0}
    function create_if_block(ctx) {
    	let section1;
    	let ul0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let section0;
    	let button;
    	let t1;
    	let button_class_value;
    	let t2;
    	let ul1;
    	let li0;
    	let a0;
    	let t3;
    	let a0_href_value;
    	let a0_class_value;
    	let t4;
    	let li1;
    	let a1;
    	let t5;
    	let a1_href_value;
    	let a1_class_value;
    	let t6;
    	let li2;
    	let a2;
    	let t7;
    	let a2_href_value;
    	let a2_class_value;
    	let t8;
    	let p;
    	let t9;
    	let t10;
    	let t11_value = (/*numActive*/ ctx[5] === 1 ? "item" : "items") + "";
    	let t11;
    	let t12;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*filteredItems*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[13].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			section1 = element("section");
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			section0 = element("section");
    			button = element("button");
    			t1 = text("Clear completed");
    			t2 = space();
    			ul1 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			t3 = text("All");
    			t4 = space();
    			li1 = element("li");
    			a1 = element("a");
    			t5 = text("Active");
    			t6 = space();
    			li2 = element("li");
    			a2 = element("a");
    			t7 = text("Completed");
    			t8 = space();
    			p = element("p");
    			t9 = text(/*numActive*/ ctx[5]);
    			t10 = space();
    			t11 = text(t11_value);
    			t12 = text(" remaining");
    			attr_dev(ul0, "class", "todo-list svelte-s9fbh5");
    			add_location(ul0, file, 91, 12, 2784);
    			attr_dev(button, "class", button_class_value = "removeCompletedItems " + (/*numCompleted*/ ctx[4] ? "" : "visibilityCollapse") + " svelte-s9fbh5");
    			add_location(button, file, 107, 16, 3509);
    			attr_dev(a0, "href", a0_href_value = `#/${/*Filter*/ ctx[0].All}`);

    			attr_dev(a0, "class", a0_class_value = "" + (null_to_empty(/*selectedFilter*/ ctx[2] == /*Filter*/ ctx[0].All
    			? "checked"
    			: "") + " svelte-s9fbh5"));

    			add_location(a0, file, 113, 24, 3764);
    			add_location(li0, file, 112, 20, 3735);
    			attr_dev(a1, "href", a1_href_value = `#/${/*Filter*/ ctx[0].Active}`);

    			attr_dev(a1, "class", a1_class_value = "" + (null_to_empty(/*selectedFilter*/ ctx[2] == /*Filter*/ ctx[0].Active
    			? "checked"
    			: "") + " svelte-s9fbh5"));

    			add_location(a1, file, 118, 24, 3985);
    			add_location(li1, file, 117, 20, 3956);
    			attr_dev(a2, "href", a2_href_value = `#/${/*Filter*/ ctx[0].Completed}`);

    			attr_dev(a2, "class", a2_class_value = "" + (null_to_empty(/*selectedFilter*/ ctx[2] == /*Filter*/ ctx[0].Completed
    			? "checked"
    			: "") + " svelte-s9fbh5"));

    			add_location(a2, file, 123, 24, 4215);
    			add_location(li2, file, 122, 20, 4186);
    			attr_dev(ul1, "class", "filter svelte-s9fbh5");
    			add_location(ul1, file, 111, 16, 3695);
    			attr_dev(p, "class", "todo-count");
    			add_location(p, file, 129, 16, 4444);
    			attr_dev(section0, "class", "todo-footer svelte-s9fbh5");
    			add_location(section0, file, 106, 12, 3463);
    			attr_dev(section1, "class", "todo-body svelte-s9fbh5");
    			add_location(section1, file, 89, 8, 2743);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section1, anchor);
    			append_dev(section1, ul0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul0, null);
    			}

    			append_dev(section1, t0);
    			append_dev(section1, section0);
    			append_dev(section0, button);
    			append_dev(button, t1);
    			append_dev(section0, t2);
    			append_dev(section0, ul1);
    			append_dev(ul1, li0);
    			append_dev(li0, a0);
    			append_dev(a0, t3);
    			append_dev(ul1, t4);
    			append_dev(ul1, li1);
    			append_dev(li1, a1);
    			append_dev(a1, t5);
    			append_dev(ul1, t6);
    			append_dev(ul1, li2);
    			append_dev(li2, a2);
    			append_dev(a2, t7);
    			append_dev(section0, t8);
    			append_dev(section0, p);
    			append_dev(p, t9);
    			append_dev(p, t10);
    			append_dev(p, t11);
    			append_dev(p, t12);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*removeCompletedItems*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredItems, removeItem*/ 264) {
    				const each_value = /*filteredItems*/ ctx[3];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul0, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}

    			if (!current || dirty & /*numCompleted*/ 16 && button_class_value !== (button_class_value = "removeCompletedItems " + (/*numCompleted*/ ctx[4] ? "" : "visibilityCollapse") + " svelte-s9fbh5")) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (!current || dirty & /*Filter*/ 1 && a0_href_value !== (a0_href_value = `#/${/*Filter*/ ctx[0].All}`)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (!current || dirty & /*selectedFilter, Filter*/ 5 && a0_class_value !== (a0_class_value = "" + (null_to_empty(/*selectedFilter*/ ctx[2] == /*Filter*/ ctx[0].All
    			? "checked"
    			: "") + " svelte-s9fbh5"))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (!current || dirty & /*Filter*/ 1 && a1_href_value !== (a1_href_value = `#/${/*Filter*/ ctx[0].Active}`)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (!current || dirty & /*selectedFilter, Filter*/ 5 && a1_class_value !== (a1_class_value = "" + (null_to_empty(/*selectedFilter*/ ctx[2] == /*Filter*/ ctx[0].Active
    			? "checked"
    			: "") + " svelte-s9fbh5"))) {
    				attr_dev(a1, "class", a1_class_value);
    			}

    			if (!current || dirty & /*Filter*/ 1 && a2_href_value !== (a2_href_value = `#/${/*Filter*/ ctx[0].Completed}`)) {
    				attr_dev(a2, "href", a2_href_value);
    			}

    			if (!current || dirty & /*selectedFilter, Filter*/ 5 && a2_class_value !== (a2_class_value = "" + (null_to_empty(/*selectedFilter*/ ctx[2] == /*Filter*/ ctx[0].Completed
    			? "checked"
    			: "") + " svelte-s9fbh5"))) {
    				attr_dev(a2, "class", a2_class_value);
    			}

    			if (!current || dirty & /*numActive*/ 32) set_data_dev(t9, /*numActive*/ ctx[5]);
    			if ((!current || dirty & /*numActive*/ 32) && t11_value !== (t11_value = (/*numActive*/ ctx[5] === 1 ? "item" : "items") + "")) set_data_dev(t11, t11_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(89:4) {#if items.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (93:16) {#each filteredItems as item, index (item.id)}
    function create_each_block(key_1, ctx) {
    	let li;
    	let input;
    	let t0;
    	let p;
    	let t1_value = /*item*/ ctx[13].description + "";
    	let t1;
    	let t2;
    	let button;
    	let t4;
    	let li_class_value;
    	let li_transition;
    	let current;
    	let mounted;
    	let dispose;

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[9].call(input, /*each_value*/ ctx[14], /*index*/ ctx[15]);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[10](/*index*/ ctx[15], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			button.textContent = "×";
    			t4 = space();
    			attr_dev(input, "class", "completeToggle svelte-s9fbh5");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 94, 24, 2990);
    			attr_dev(p, "class", "description svelte-s9fbh5");
    			add_location(p, file, 98, 24, 3177);
    			attr_dev(button, "class", "removeItem svelte-s9fbh5");
    			add_location(button, file, 99, 24, 3247);
    			attr_dev(li, "class", li_class_value = "todo-item " + (/*item*/ ctx[13].completed ? "completed" : "") + " svelte-s9fbh5");
    			add_location(li, file, 93, 20, 2890);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			input.checked = /*item*/ ctx[13].completed;
    			append_dev(li, t0);
    			append_dev(li, p);
    			append_dev(p, t1);
    			append_dev(li, t2);
    			append_dev(li, button);
    			append_dev(li, t4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", input_change_handler),
    					listen_dev(button, "click", click_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*filteredItems*/ 8) {
    				input.checked = /*item*/ ctx[13].completed;
    			}

    			if ((!current || dirty & /*filteredItems*/ 8) && t1_value !== (t1_value = /*item*/ ctx[13].description + "")) set_data_dev(t1, t1_value);

    			if (!current || dirty & /*filteredItems*/ 8 && li_class_value !== (li_class_value = "todo-item " + (/*item*/ ctx[13].completed ? "completed" : "") + " svelte-s9fbh5")) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, true);
    				li_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, false);
    			li_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (detaching && li_transition) li_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(93:16) {#each filteredItems as item, index (item.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let section1;
    	let section0;
    	let div;
    	let t2;
    	let input;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*items*/ ctx[1].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "todos";
    			t1 = space();
    			section1 = element("section");
    			section0 = element("section");
    			div = element("div");
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "svelte-s9fbh5");
    			add_location(h1, file, 75, 0, 2425);
    			attr_dev(div, "class", "empty svelte-s9fbh5");
    			add_location(div, file, 79, 8, 2510);
    			attr_dev(input, "class", "todo-input svelte-s9fbh5");
    			attr_dev(input, "placeholder", "What needs to be done?");
    			input.autofocus = true;
    			attr_dev(input, "size", "22");
    			add_location(input, file, 80, 8, 2544);
    			attr_dev(section0, "class", "todo-header svelte-s9fbh5");
    			add_location(section0, file, 78, 4, 2472);
    			attr_dev(section1, "class", "todo-app svelte-s9fbh5");
    			add_location(section1, file, 77, 0, 2441);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, section0);
    			append_dev(section0, div);
    			append_dev(section0, t2);
    			append_dev(section0, input);
    			append_dev(section1, t3);
    			if (if_block) if_block.m(section1, null);
    			current = true;
    			input.focus();

    			if (!mounted) {
    				dispose = listen_dev(input, "keydown", /*inputItem*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*items*/ ctx[1].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*items*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(section1);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	var Filter;

    	(function (Filter) {
    		Filter["All"] = "";
    		Filter["Active"] = "active";
    		Filter["Completed"] = "completed";
    	})(Filter || (Filter = {}));

    	let items;
    	let selectedFilter = Filter.All;

    	// let selectedItemToEditIndex: number = undefined;
    	// load items from previous session if available
    	try {
    		items = JSON.parse(localStorage.getItem("todos-svelte")) || [];
    	} catch(err) {
    		items = [];
    	}

    	function applyFilter() {
    		const urlFragment = window.location.hash;

    		if (urlFragment === `#/${Filter.Active}`) {
    			$$invalidate(2, selectedFilter = Filter.Active);
    		} else if (urlFragment === `#/${Filter.Completed}`) {
    			$$invalidate(2, selectedFilter = Filter.Completed);
    		} else {
    			// is applied when URL fragment is `#/${Filter.All}`, or anything else including empty!
    			$$invalidate(2, selectedFilter = Filter.All);
    		}
    	}

    	window.addEventListener("hashchange", applyFilter);

    	// execute at least once in case opens page directly with fragment URL
    	applyFilter();

    	function inputItem(event) {
    		const key = event.key;
    		const val = event.target.value.trim();

    		if (key == "Enter" && val !== "") {
    			addItem({
    				id: uuid(),
    				description: val,
    				completed: false
    			});

    			event.target.value = "";
    		}
    	}

    	function removeCompletedItems() {
    		$$invalidate(1, items = items.filter(item => !item.completed));
    	}

    	function removeItem(index) {
    		$$invalidate(1, items = [...items.slice(0, index), ...items.slice(index + 1)]);
    	}

    	function addItem(item) {
    		$$invalidate(1, items = [...items, item]);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler(each_value, index) {
    		each_value[index].completed = this.checked;
    		((($$invalidate(3, filteredItems), $$invalidate(2, selectedFilter)), $$invalidate(0, Filter)), $$invalidate(1, items));
    	}

    	const click_handler = index => removeItem(index);

    	$$self.$capture_state = () => ({
    		uuid,
    		slide,
    		Filter,
    		items,
    		selectedFilter,
    		applyFilter,
    		inputItem,
    		removeCompletedItems,
    		removeItem,
    		addItem,
    		filteredItems,
    		numCompleted,
    		numActive
    	});

    	$$self.$inject_state = $$props => {
    		if ("Filter" in $$props) $$invalidate(0, Filter = $$props.Filter);
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("selectedFilter" in $$props) $$invalidate(2, selectedFilter = $$props.selectedFilter);
    		if ("filteredItems" in $$props) $$invalidate(3, filteredItems = $$props.filteredItems);
    		if ("numCompleted" in $$props) $$invalidate(4, numCompleted = $$props.numCompleted);
    		if ("numActive" in $$props) $$invalidate(5, numActive = $$props.numActive);
    	};

    	let filteredItems;
    	let numCompleted;
    	let numActive;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedFilter, Filter, items*/ 7) {
    			 $$invalidate(3, filteredItems = selectedFilter === Filter.Active
    			? items.filter(item => !item.completed)
    			: selectedFilter === Filter.Completed
    				? items.filter(item => item.completed)
    				: items);
    		}

    		if ($$self.$$.dirty & /*items*/ 2) {
    			 $$invalidate(4, numCompleted = items.filter(item => item.completed).length);
    		}

    		if ($$self.$$.dirty & /*items, numCompleted*/ 18) {
    			 $$invalidate(5, numActive = items.length - numCompleted);
    		}

    		if ($$self.$$.dirty & /*items*/ 2) {
    			 try {
    				localStorage.setItem("todos-svelte", JSON.stringify(items));
    			} catch(err) {
    				
    			} // noop
    		}
    	};

    	return [
    		Filter,
    		items,
    		selectedFilter,
    		filteredItems,
    		numCompleted,
    		numActive,
    		inputItem,
    		removeCompletedItems,
    		removeItem,
    		input_change_handler,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
