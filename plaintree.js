class PlainTree {

    constructor(container, options) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = Object.assign({
            data: [], depth: 0, onLoaded: null, onNodeClick: null,
        }, options);

        this.nodeElements = {};
        this.nodeData = {};
        this.leafData = {};
        this.#init();
    }

    expandNode(id) {
        let node = this.nodeData[id];
        const distance = node.depth - this.options.depth;
        for (let i = 0; i < distance; i++) {
            node = this.nodeData[node.pid];
        }

        this.#expandNode(node);
        const $node = this.nodeElements[id];
        const label = $node.querySelector('.plaintree-label');
        label && label.click();
    }

    expandAll() {
        this.#expandNode(this.data[0]);
    }

    collapseAll() {
        for (const leaf of Object.values(this.leafData)) {
            this.#collapseNode(leaf);
        }
    }

    async #init() {
        this.data = await this.#convert(this.options.data);
        const walkTree = (nodes, parent) => {
            for (const node of nodes) {
                this.nodeData[node.id] = node;

                if (parent) node.parent = parent;
                if (node.children && node.children.length) {
                    walkTree(node.children, node);
                } else {
                    this.leafData[node.id] = node;
                }
            }
        };

        walkTree(this.data);
        this.#render();
        if (this.options.onLoaded) {
            this.options.onLoaded.call(this, this);
        }
    }

    #render() {
        const $root = this.#createRootElement();
        $root.append(this.#buildTree(this.data, 0));
        this.#bindEvent($root);
        this.container.append($root);
    }

    #buildTree(nodes, depth) {
        const $group = this.#createGroupElement();

        for (const node of nodes) {
            const $node = this.#createNodeElement(node, depth === this.options.depth);
            this.nodeElements[node.id] = $node;
            node.depth = depth;

            if (node.children && node.children.length) {
                const $childNode = this.#buildTree(node.children, depth + 1);
                $node.append($childNode);
            }
            $group.append($node);
        }
        return $group;
    }

    #bindEvent($root) {
        $root.addEventListener('click', e => {
            const { target } = e;
            if (
                target.nodeName === 'SPAN' &&
                target.classList.contains('plaintree-switcher')) {
                this.#onSwitcherClick(target.parentNode);
            } else if (
                target.nodeName === 'SPAN' &&
                target.classList.contains('plaintree-label')) {
                this.#onNodeClick(target.parentNode.nodeId);
            } else if (
                target.nodeName === 'LI' &&
                target.classList.contains('plaintree-node')) {
                this.#onNodeClick(target.nodeId);
            }
        });
    }

    #onNodeClick(id) {
        this.selectedNode && this.selectedNode.classList.remove('plaintree-selected');
        this.selectedNode = this.nodeElements[id];
        this.selectedNode.classList.add('plaintree-selected');

        if (this.options.onNodeClick) {
            this.options.onNodeClick(this.nodeData[id]);
        }
    }

    #onSwitcherClick($node) {
        const el = $node.lastChild;
        const height = el.scrollHeight;

        if ($node.classList.contains('plaintree-collapsed')) {
            this.#animate(150, {
                enter() { el.style.height = 0; el.style.opacity = 0; },
                active() { el.style.height = `${height}px`; el.style.opacity = 1; },
                leave() { el.style.height = ''; el.style.opacity = ''; $node.classList.remove('plaintree-collapsed'); },
            });
        } else {
            this.#animate(150, {
                enter() { el.style.height = `${height}px`; el.style.opacity = 1; },
                active() { el.style.height = 0; el.style.opacity = 0; },
                leave() { el.style.height = ''; el.style.opacity = ''; $node.classList.add('plaintree-collapsed'); },
            });
        }
    }

    #createRootElement() {
        const div = document.createElement('div');
        div.classList.add('plaintree');
        return div;
    }

    #createGroupElement = function () {
        const ul = document.createElement('ul');
        ul.classList.add('plaintree-group');
        return ul;
    }

    #createNodeElement = function (node, collapsed) {
        const li = document.createElement('li');
        li.classList.add('plaintree-node');
        if (collapsed) {
            li.classList.add('plaintree-collapsed');
        }

        const isLeaf = !node.children || !node.children.length;
        const icon = document.createElement('span');
        icon.classList.add(isLeaf ? 'plaintree-leaf' : 'plaintree-switcher');
        li.append(icon);

        const label = document.createElement('span');
        label.classList.add('plaintree-label');

        const text = document.createTextNode(node.text);
        label.append(text);
        li.append(label);
        li.nodeId = node.id;
        return li;
    }

    #collapseNode(node) {
        try {
            const $node = this.nodeElements[node.parent.id];
            if (!$node.classList.contains('plaintree-collapsed')) {
                const switcher = $node.querySelector('.plaintree-switcher');
                switcher && switcher.click();
            }
        } catch (_) {
            return;
        }
        if (node.hasOwnProperty('parent')) {
             this.#collapseNode(node.parent);
        }
    }

    #expandNode(node) {
        const $node = this.nodeElements[node.id];
        if ($node.classList.contains('plaintree-collapsed')) {
            const switcher = $node.querySelector('.plaintree-switcher');
            switcher && switcher.click();
        }
        if (node.hasOwnProperty('children')) {
            node.children.forEach(child => this.#expandNode(child));
        }
    }

    #animate(duration, callback) {
        requestAnimationFrame(() => {
            callback.enter();
            requestAnimationFrame(() => {
                callback.active();
                setTimeout(() => callback.leave(), duration);
            });
        });
    }

    async #convert(data) {
        data = typeof data === 'function' ? await data() : data;
        data = Array.isArray(data) ? this.#list2Tree(data) : [data];
        return data;
    }

    #list2Tree(list) {
        const result = [];
        const map = new Map();

        for (const node of list) {
            node['children'] = node['children'] || [];
            map.set(node['id'], node);
        }
        for (const node of list) {
            const parent = map.get(node['pid']);
            const entry = parent ? parent.children : result;
            entry.push(node);
        }
        return result;
    }

}
