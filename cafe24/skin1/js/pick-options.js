/**
 * Cafe24 골라담기 옵션 UI
 * Cafe24 기본 옵션 클릭과 선택상품 목록을 그대로 사용한다.
 */
(function bootstrapPickOptions(window, document) {
  'use strict';

  const config = window.PICK_OPTIONS_CONFIG;
  if (!config) {
    console.error('[pick-options] pick-options-config.js를 먼저 불러와 주세요.');
    return;
  }

  const formatNumber = new Intl.NumberFormat('ko-KR');

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function currentProductNo() {
    return new URLSearchParams(window.location.search).get(config.target.productNoQueryKey);
  }

  function isTargetProduct() {
    return config.target.productNos.includes(currentProductNo());
  }

  function template(text, values) {
    return Object.keys(values).reduce(function replaceToken(result, key) {
      return result.replace('{' + key + '}', values[key]);
    }, text);
  }

  function createNativeAdapter(optionList, optionSelect, totalProducts) {
    function nativeItems() {
      return Array.from(optionList.querySelectorAll(config.selectors.optionItem));
    }

    function isUnavailable(item) {
      return config.option.unavailableClasses.some(function hasClass(className) {
        return item.classList.contains(className);
      });
    }

    function getNativeOption(value) {
      const item = nativeItems().find(function findItem(candidate) {
        return candidate.getAttribute(config.option.valueAttribute) === value;
      });
      const selectOption = Array.from(optionSelect.options).find(function findOption(option) {
        return option.value === value;
      });
      return {
        value: value,
        exists: Boolean(item && selectOption),
        unavailable: !item || !selectOption || isUnavailable(item) || selectOption.disabled,
        item: item,
      };
    }

    function selectedValues() {
      return Array.from(totalProducts.querySelectorAll(config.selectors.selectedItemCode))
        .map(function itemValue(input) { return input.value; });
    }

    function select(value) {
      const option = getNativeOption(value);
      if (!option.exists) throw new Error('[pick-options] 존재하지 않는 옵션입니다: ' + value);
      if (option.unavailable) throw new Error('[pick-options] 선택할 수 없는 옵션입니다: ' + value);
      const trigger = option.item.querySelector('a');
      if (!trigger) throw new Error('[pick-options] 카페24 옵션 버튼을 찾지 못했습니다.');
      trigger.click();
    }

    return Object.freeze({
      getNativeOption: getNativeOption,
      selectedValues: selectedValues,
      select: select,
    });
  }

  function createController(adapter) {
    function bundleState(bundle) {
      const selected = adapter.selectedValues();
      const selectedOptions = bundle.options.filter(function isSelected(option) {
        return selected.includes(option.value);
      });
      const availableOptions = bundle.options.filter(function isAvailable(option) {
        const nativeOption = adapter.getNativeOption(option.value);
        return nativeOption.exists && !nativeOption.unavailable;
      });
      const next = availableOptions.find(function findNext(option) {
        return !selected.includes(option.value);
      }) || null;

      return {
        quantity: bundle.quantity,
        selectedCount: selectedOptions.length,
        maxCount: availableOptions.length,
        selected: selectedOptions.length > 0,
        complete: availableOptions.length > 0 && selectedOptions.length >= availableOptions.length,
        unavailable: availableOptions.length === 0,
        nextOption: next,
      };
    }

    function getState() {
      return config.bundles.map(function stateForBundle(bundle) {
        return bundleState(bundle);
      });
    }

    function add(quantity) {
      const bundle = config.bundles.find(function findBundle(candidate) {
        return candidate.quantity === Number(quantity);
      });
      if (!bundle) throw new Error('[pick-options] 등록되지 않은 개입수입니다: ' + quantity);

      const state = bundleState(bundle);
      if (!state.nextOption) {
        emit(config.events.limitReached, { bundle: bundle, state: state });
        return false;
      }

      adapter.select(state.nextOption.value);
      return state.nextOption.value;
    }

    return Object.freeze({
      add: add,
      getState: getState,
      selectedValues: adapter.selectedValues,
    });
  }

  function createInterface(controller, optionTable, totalProducts) {
    let draft = null;
    const completedSelections = [];
    const section = document.createElement('section');
    section.className = 'pick-options';
    section.setAttribute('aria-labelledby', 'pick-options-heading');
    section.innerHTML =
      '<button class="pick-options__toggle" type="button" aria-expanded="true" aria-controls="pick-options-panel">' +
        '<span id="pick-options-heading"></span><span class="pick-options__chevron" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="pick-options__panel" id="pick-options-panel">' +
        '<p class="pick-options__description"></p><div class="pick-options__cards"></div>' +
        '<div class="pick-options__flavor-picker" hidden></div>' +
        '<div class="pick-options__completed" aria-live="polite"></div>' +
        '<p class="pick-options__notice" role="status" aria-live="polite"></p>' +
      '</div>';

    const toggle = section.querySelector('.pick-options__toggle');
    const panel = section.querySelector('.pick-options__panel');
    const cards = section.querySelector('.pick-options__cards');
    const notice = section.querySelector('.pick-options__notice');
    const flavorPicker = section.querySelector('.pick-options__flavor-picker');
    const completed = section.querySelector('.pick-options__completed');
    section.querySelector('#pick-options-heading').textContent = config.ui.heading;
    section.querySelector('.pick-options__description').textContent = config.ui.description;

    function cardMarkup(bundle) {
      const badge = bundle.badge
        ? '<span class="pick-options__badge pick-options__badge--' + bundle.badgeTone + '"></span>'
        : '';
      return '<button type="button" class="pick-options__card" data-quantity="' + bundle.quantity + '">' +
        '<span class="pick-options__check" aria-hidden="true"></span>' +
        '<strong class="pick-options__label"></strong>' +
        '<span class="pick-options__price-block">' +
          '<span class="pick-options__price-row"><strong class="pick-options__price"></strong>' +
          '<span class="pick-options__price-note"></span>' + badge + '</span>' +
          '<span class="pick-options__sub-row"><span class="pick-options__unit-price"></span>' +
          '<span class="pick-options__count"></span></span>' +
        '</span>' +
      '</button>';
    }

    config.bundles.forEach(function renderBundle(bundle) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = cardMarkup(bundle);
      const card = wrapper.firstElementChild;
      card.querySelector('.pick-options__label').textContent = bundle.label;
      card.querySelector('.pick-options__price').textContent =
        formatNumber.format(bundle.price) + config.ui.currency;
      card.querySelector('.pick-options__price-note').textContent = bundle.priceNote;
      card.querySelector('.pick-options__unit-price').textContent =
        '1개 : ' + formatNumber.format(bundle.unitPrice) + config.ui.currency;
      if (bundle.badge) card.querySelector('.pick-options__badge').textContent = bundle.badge;
      cards.appendChild(card);
    });

    function draftTotalUnits() {
      return draft ? Object.values(draft.counts).reduce(function sum(total, count) {
        return total + count;
      }, 0) : 0;
    }

    function renderFlavorPicker() {
      if (!draft) {
        flavorPicker.hidden = true;
        flavorPicker.innerHTML = '';
        return;
      }
      const targetUnits = draft.bundle.quantity / config.flavorUnitQuantity;
      const currentUnits = draftTotalUnits();
      flavorPicker.hidden = false;
      flavorPicker.innerHTML =
        '<div class="pick-options__flavor-head">' +
          '<div><strong class="pick-options__flavor-title"></strong><p class="pick-options__flavor-description"></p></div>' +
          '<button type="button" class="pick-options__flavor-close" aria-label="' + config.ui.cancelLabel + '">×</button>' +
        '</div>' +
        '<div class="pick-options__flavor-list"></div>' +
        '<div class="pick-options__flavor-footer">' +
          '<strong class="pick-options__flavor-total"></strong>' +
          '<button type="button" class="pick-options__complete"></button>' +
        '</div>';
      flavorPicker.querySelector('.pick-options__flavor-title').textContent = template(config.ui.flavorHeading, {
        label: draft.bundle.label,
      });
      flavorPicker.querySelector('.pick-options__flavor-description').textContent = config.ui.flavorDescription;
      const list = flavorPicker.querySelector('.pick-options__flavor-list');
      config.flavors.forEach(function renderFlavor(flavor) {
        const count = draft.counts[flavor.id] || 0;
        const row = document.createElement('div');
        row.className = 'pick-options__flavor-row';
        row.dataset.flavorId = flavor.id;
        row.innerHTML =
          '<span class="pick-options__flavor-image"></span>' +
          '<span class="pick-options__flavor-info"><strong></strong><small></small></span>' +
          '<span class="pick-options__stepper">' +
            '<button type="button" data-action="decrease" aria-label="' + config.ui.decreaseLabel + '">−</button>' +
            '<output></output>' +
            '<button type="button" data-action="increase" aria-label="' + config.ui.increaseLabel + '">+</button>' +
          '</span>';
        const image = row.querySelector('.pick-options__flavor-image');
        if (flavor.image) {
          const img = document.createElement('img');
          img.src = flavor.image;
          img.alt = flavor.name + config.ui.imageAltSuffix;
          image.appendChild(img);
        } else {
          image.textContent = flavor.name.slice(0, 1);
        }
        row.querySelector('.pick-options__flavor-info strong').textContent = flavor.name;
        row.querySelector('.pick-options__flavor-info small').textContent = config.ui.flavorUnitLabel;
        row.querySelector('output').textContent = count;
        row.querySelector('[data-action="decrease"]').disabled = count === 0;
        row.querySelector('[data-action="increase"]').disabled = currentUnits >= targetUnits;
        list.appendChild(row);
      });
      flavorPicker.querySelector('.pick-options__flavor-total').textContent = template(config.ui.selectedTotalTemplate, {
        current: currentUnits * config.flavorUnitQuantity,
        target: draft.bundle.quantity,
      });
      const completeButton = flavorPicker.querySelector('.pick-options__complete');
      completeButton.textContent = config.ui.completeLabel;
      completeButton.disabled = currentUnits !== targetUnits;
    }

    function renderCompleted() {
      const nativeSelectedValues = controller.selectedValues();
      for (let index = completedSelections.length - 1; index >= 0; index -= 1) {
        if (!nativeSelectedValues.includes(completedSelections[index].optionValue)) {
          completedSelections.splice(index, 1);
        }
      }
      completed.innerHTML = '';
      completedSelections.forEach(function renderSelection(selection) {
        const item = document.createElement('article');
        item.className = 'pick-options__completed-item';
        item.innerHTML = '<strong></strong><p></p><span></span>';
        item.querySelector('strong').textContent = selection.bundle.label;
        item.querySelector('p').textContent = selection.flavors.map(function flavorText(entry) {
          return entry.name + ' × ' + entry.count;
        }).join(' + ');
        item.querySelector('span').textContent = '총 ' + selection.bundle.quantity + '개';
        completed.appendChild(item);
      });
      if (completedSelections.length) {
        const total = completedSelections.reduce(function sumQuantity(sum, selection) {
          return sum + selection.bundle.quantity;
        }, 0);
        const totalElement = document.createElement('p');
        totalElement.className = 'pick-options__completed-total';
        totalElement.textContent = '총 수량 ' + formatNumber.format(total) + '개';
        completed.appendChild(totalElement);
      }
    }

    function sync() {
      const states = controller.getState();
      states.forEach(function syncCard(state) {
        const card = cards.querySelector('[data-quantity="' + state.quantity + '"]');
        const count = card.querySelector('.pick-options__count');
        card.classList.toggle('is-selected', state.selected);
        card.classList.toggle('is-complete', state.complete);
        card.disabled = state.complete || state.unavailable;
        card.setAttribute('aria-pressed', String(state.selected));
        count.textContent = state.unavailable
          ? config.ui.soldOutLabel
          : template(config.ui.countTemplate, {
            selected: state.selectedCount,
            max: state.maxCount,
          });
      });
      emit(config.events.selectionChange, { states: states });
    }

    cards.addEventListener('click', function handleCardClick(event) {
      const card = event.target.closest('[data-quantity]');
      if (!card || card.disabled) return;
      notice.textContent = '';
      const bundle = config.bundles.find(function findBundle(candidate) {
        return candidate.quantity === Number(card.dataset.quantity);
      });
      draft = { bundle: bundle, counts: {} };
      renderFlavorPicker();
      flavorPicker.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    flavorPicker.addEventListener('click', function handleFlavorClick(event) {
      if (!draft) return;
      if (event.target.closest('.pick-options__flavor-close')) {
        draft = null;
        renderFlavorPicker();
        return;
      }
      const completeButton = event.target.closest('.pick-options__complete');
      if (completeButton && !completeButton.disabled) {
        const flavors = config.flavors.map(function selectedFlavor(flavor) {
          return { id: flavor.id, name: flavor.name, count: draft.counts[flavor.id] || 0 };
        }).filter(function hasCount(flavor) { return flavor.count > 0; });
        const bundle = draft.bundle;
        const optionValue = controller.add(bundle.quantity);
        if (optionValue) {
          completedSelections.push({ bundle: bundle, flavors: flavors, optionValue: optionValue });
          renderCompleted();
        }
        draft = null;
        renderFlavorPicker();
        window.setTimeout(sync, 0);
        return;
      }
      const action = event.target.closest('[data-action]');
      const row = event.target.closest('[data-flavor-id]');
      if (!action || !row) return;
      const id = row.dataset.flavorId;
      const current = draft.counts[id] || 0;
      const targetUnits = draft.bundle.quantity / config.flavorUnitQuantity;
      if (action.dataset.action === 'increase' && draftTotalUnits() < targetUnits) {
        draft.counts[id] = current + 1;
      }
      if (action.dataset.action === 'decrease' && current > 0) {
        draft.counts[id] = current - 1;
      }
      renderFlavorPicker();
    });

    toggle.addEventListener('click', function togglePanel() {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });

    window.addEventListener(config.events.limitReached, function showLimit(event) {
      notice.textContent = event.detail.bundle.label + '은(는) ' + config.ui.limitLabel + ' 상태입니다.';
    });

    const observer = new MutationObserver(function selectedProductsChanged() {
      sync();
      renderCompleted();
    });
    observer.observe(totalProducts, { childList: true, subtree: true });

    sync();
    optionTable.insertAdjacentElement('afterend', section);
    document.documentElement.classList.add('pick-options-enhanced');
    return section;
  }

  function init() {
    if (!isTargetProduct() || window.PickOptions) return;
    const optionTables = document.querySelectorAll(config.selectors.optionTable);
    const optionLists = document.querySelectorAll(config.selectors.optionList);
    const optionSelects = document.querySelectorAll(config.selectors.optionSelect);
    const totalProducts = document.querySelector(config.selectors.totalProducts);
    if (optionTables.length !== 1 || optionLists.length !== 1 || optionSelects.length !== 1 || !totalProducts) {
      console.error('[pick-options] 필요한 카페24 옵션 DOM을 찾지 못했습니다.');
      return;
    }

    const adapter = createNativeAdapter(optionLists[0], optionSelects[0], totalProducts);
    const controller = createController(adapter);
    const element = createInterface(controller, optionTables[0], totalProducts);
    window.PickOptions = controller;
    emit(config.events.ready, { controller: controller, element: element });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
