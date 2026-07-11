/**
 * Cafe24 골라담기 옵션 어댑터
 */
(function bootstrapPickOptions(window, document) {
  'use strict';

  const config = window.PICK_OPTIONS_CONFIG;

  if (!config) {
    console.error('[pick-options] pick-options-config.js를 먼저 불러와 주세요.');
    return;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function currentProductNo() {
    return new URLSearchParams(window.location.search).get(config.target.productNoQueryKey);
  }

  function isTargetProduct() {
    return config.target.productNos.includes(currentProductNo());
  }

  function isUnavailable(item) {
    return config.option.unavailableClasses.some(function hasUnavailableClass(className) {
      return item.classList.contains(className);
    });
  }

  function parseLabel(label) {
    const match = label.trim().match(config.option.labelPattern);

    if (!match) {
      return null;
    }

    return {
      quantity: Number(match[1]),
      variant: Number(match[2]),
    };
  }

  function createController(optionList, optionSelect) {
    const itemSelector = config.selectors.optionItem;

    function items() {
      return Array.from(optionList.querySelectorAll(itemSelector));
    }

    function optionFromItem(item) {
      const value = item.getAttribute(config.option.valueAttribute) || '';
      const selectOption = Array.from(optionSelect.options).find(function findOption(option) {
        return option.value === value;
      });
      const label = selectOption ? selectOption.text.trim() : item.textContent.trim();
      const parsed = parseLabel(label);
      const priceMatch = label.match(/\(([^)]*)\)\s*$/);

      return {
        value: value,
        label: label,
        quantity: parsed ? parsed.quantity : null,
        variant: parsed ? parsed.variant : null,
        priceModifier: priceMatch ? priceMatch[1] : '',
        selected: item.classList.contains(config.option.selectedClass),
        unavailable: isUnavailable(item) || Boolean(selectOption && selectOption.disabled),
      };
    }

    function getOptions() {
      return items().map(optionFromItem);
    }

    function getSelected() {
      const selectedItem = items().find(function findSelectedItem(item) {
        return item.classList.contains(config.option.selectedClass);
      });

      if (selectedItem) {
        return optionFromItem(selectedItem);
      }

      const selectedValue = optionSelect.value;

      if (config.option.emptyValues.includes(selectedValue)) {
        return null;
      }

      return getOptions().find(function findSelected(option) {
        return option.value === selectedValue;
      }) || null;
    }

    function select(value) {
      const item = items().find(function findItem(candidate) {
        return candidate.getAttribute(config.option.valueAttribute) === value;
      });

      if (!item) {
        throw new Error('[pick-options] 존재하지 않는 옵션 값입니다: ' + value);
      }

      if (isUnavailable(item)) {
        throw new Error('[pick-options] 선택할 수 없는 옵션입니다: ' + value);
      }

      const trigger = item.querySelector('a');

      if (!trigger) {
        throw new Error('[pick-options] 옵션 선택 버튼을 찾을 수 없습니다.');
      }

      trigger.click();
    }

    function notifySelectionChange() {
      // Cafe24의 click/change 핸들러가 먼저 DOM과 select 값을 갱신하게 한다.
      window.setTimeout(function dispatchSelectionChange() {
        emit(config.events.selectionChange, {
          productNo: currentProductNo(),
          selected: getSelected(),
          options: getOptions(),
        });
      }, 0);
    }

    optionList.addEventListener('click', function handleOptionClick(event) {
      if (event.target.closest(itemSelector)) {
        notifySelectionChange();
      }
    });

    optionSelect.addEventListener('change', notifySelectionChange);

    return Object.freeze({
      getOptions: getOptions,
      getSelected: getSelected,
      select: select,
    });
  }

  function createInterface(controller, optionTable) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    const description = document.createElement('p');
    const groups = document.createElement('div');

    section.className = 'pick-options';
    section.setAttribute('aria-labelledby', 'pick-options-heading');
    heading.id = 'pick-options-heading';
    heading.className = 'pick-options__heading';
    heading.textContent = config.ui.heading;
    description.className = 'pick-options__description';
    description.textContent = config.ui.description;
    groups.className = 'pick-options__groups';

    section.appendChild(heading);
    section.appendChild(description);
    section.appendChild(groups);

    function buttonFor(option) {
      const button = document.createElement('button');
      const variantText = option.variant === null
        ? option.label
        : config.ui.variantPrefix + ' ' + option.variant;

      button.type = 'button';
      button.className = 'pick-options__option';
      button.dataset.optionValue = option.value;
      button.disabled = option.unavailable;
      button.setAttribute('aria-pressed', String(option.selected));
      button.innerHTML =
        '<span class="pick-options__variant"></span>' +
        '<span class="pick-options__status" aria-hidden="true"></span>';
      button.querySelector('.pick-options__variant').textContent = variantText;
      button.querySelector('.pick-options__status').textContent = option.unavailable
        ? config.ui.unavailableText
        : option.priceModifier;

      return button;
    }

    function render(options) {
      const optionsByQuantity = new Map();

      options.forEach(function groupOption(option) {
        const key = option.quantity === null ? option.label : option.quantity;

        if (!optionsByQuantity.has(key)) {
          optionsByQuantity.set(key, []);
        }

        optionsByQuantity.get(key).push(option);
      });

      groups.replaceChildren();

      optionsByQuantity.forEach(function renderGroup(groupOptions, quantity) {
        const group = document.createElement('fieldset');
        const legend = document.createElement('legend');
        const optionGrid = document.createElement('div');

        group.className = 'pick-options__group';
        legend.className = 'pick-options__quantity';
        legend.textContent = typeof quantity === 'number'
          ? quantity + config.ui.quantitySuffix
          : String(quantity);
        optionGrid.className = 'pick-options__grid';

        groupOptions.forEach(function appendOption(option) {
          optionGrid.appendChild(buttonFor(option));
        });

        group.appendChild(legend);
        group.appendChild(optionGrid);
        groups.appendChild(group);
      });
    }

    function sync(options) {
      const latestOptions = options || controller.getOptions();
      const buttonsByValue = new Map();

      groups.querySelectorAll('[data-option-value]').forEach(function indexButton(button) {
        buttonsByValue.set(button.dataset.optionValue, button);
      });

      latestOptions.forEach(function syncOption(option) {
        const button = buttonsByValue.get(option.value);

        if (!button) {
          return;
        }

        button.disabled = option.unavailable;
        button.setAttribute('aria-pressed', String(option.selected));
        button.classList.toggle('is-selected', option.selected);
      });
    }

    groups.addEventListener('click', function handleInterfaceClick(event) {
      const button = event.target.closest('[data-option-value]');

      if (!button || button.disabled) {
        return;
      }

      controller.select(button.dataset.optionValue);
    });

    window.addEventListener(config.events.selectionChange, function handleSelectionChange(event) {
      sync(event.detail.options);
    });

    render(controller.getOptions());
    optionTable.insertAdjacentElement('afterend', section);
    document.documentElement.classList.add('pick-options-enhanced');

    return Object.freeze({
      element: section,
      sync: sync,
    });
  }

  function init() {
    if (!isTargetProduct()) {
      return;
    }

    if (window.PickOptions) {
      return;
    }

    const optionTables = document.querySelectorAll(config.selectors.optionTable);
    const optionLists = document.querySelectorAll(config.selectors.optionList);
    const optionSelects = document.querySelectorAll(config.selectors.optionSelect);

    if (optionTables.length !== 1 || optionLists.length !== 1 || optionSelects.length !== 1) {
      console.error(
        '[pick-options] 옵션 요소를 하나씩 찾을 수 없습니다.',
        {
          optionTables: optionTables.length,
          optionLists: optionLists.length,
          optionSelects: optionSelects.length,
        },
      );
      return;
    }

    const controller = createController(optionLists[0], optionSelects[0]);
    const interfaceController = createInterface(controller, optionTables[0]);
    window.PickOptions = controller;

    emit(config.events.ready, {
      productNo: currentProductNo(),
      controller: controller,
      element: interfaceController.element,
      options: controller.getOptions(),
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
