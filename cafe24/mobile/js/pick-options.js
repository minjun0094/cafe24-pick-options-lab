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
      return selectedEntries().map(function entryValue(entry) { return entry.value; });
    }

    function selectedEntries() {
      return Array.from(totalProducts.querySelectorAll(config.selectors.selectedItemCode))
        .filter(function activeSelectedEntry(input) {
          const row = input.closest('tr');
          return Boolean(row && row.isConnected && !row.hidden && window.getComputedStyle(row).display !== 'none');
        })
        .map(function selectedEntry(input) {
          const row = input.closest('tr');
          const quantityInput = row && row.querySelector('.quantity input, input.quantity_opt');
          const quantity = Math.max(1, Number(quantityInput && quantityInput.value) || 1);
          return { value: input.value, quantity: quantity, row: row };
        });
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
      selectedEntries: selectedEntries,
      selectedValues: selectedValues,
      select: select,
    });
  }

  function createController(adapter) {
    function bundleState(bundle) {
      const selectedEntries = adapter.selectedEntries();
      const selected = selectedEntries.map(function selectedValue(entry) { return entry.value; });
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
      const usedCount = selectedEntries.reduce(function countSelectedUnits(total, entry) {
        const belongsToBundle = bundle.options.some(function matchesOption(option) {
          return option.value === entry.value;
        });
        return total + (belongsToBundle ? entry.quantity : 0);
      }, 0);
      const maxCount = availableOptions.length;

      return {
        quantity: bundle.quantity,
        selectedCount: usedCount,
        maxCount: maxCount,
        selected: selectedOptions.length > 0,
        complete: maxCount > 0 && usedCount >= maxCount,
        unavailable: availableOptions.length === 0,
        nextOption: usedCount < maxCount ? next : null,
      };
    }

    function getState() {
      return config.bundles.map(function stateForBundle(bundle) {
        return bundleState(bundle);
      });
    }

    function stateForOptionValue(value) {
      const bundle = config.bundles.find(function bundleForValue(candidate) {
        return candidate.options.some(function matchesOption(option) { return option.value === value; });
      });
      return bundle ? bundleState(bundle) : null;
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
      stateForOptionValue: stateForOptionValue,
      selectedValues: adapter.selectedValues,
    });
  }

  function createInterface(controller, optionTable, totalProducts, totalPrice) {
    let draft = null;
    let isSubmitting = false;
    let submitUnlockTimer = null;
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
      '</div>' +
      '<div class="pick-options__toast" role="status" aria-live="polite" hidden>' +
        '<span aria-hidden="true">✓</span><strong>선택한 상품이 추가되었습니다</strong>' +
      '</div>';

    const toggle = section.querySelector('.pick-options__toggle');
    const panel = section.querySelector('.pick-options__panel');
    const cards = section.querySelector('.pick-options__cards');
    const notice = section.querySelector('.pick-options__notice');
    const flavorPicker = section.querySelector('.pick-options__flavor-picker');
    const completed = section.querySelector('.pick-options__completed');
    const toast = section.querySelector('.pick-options__toast');
    const shipping = document.createElement('section');
    shipping.className = 'pick-options__shipping';
    shipping.setAttribute('aria-label', '무료배송 진행상황');
    shipping.innerHTML =
      '<div class="pick-options__shipping-track" role="progressbar" aria-valuemin="0" aria-valuemax="100">' +
        '<span class="pick-options__shipping-fill"></span>' +
        '<span class="pick-options__shipping-truck">🚚</span>' +
      '</div>' +
      '<div class="pick-options__shipping-copy">' +
        '<p></p><span class="pick-options__shipping-threshold"></span>' +
      '</div>';
    if (config.shippingProgress.enabled) {
      totalPrice.insertAdjacentElement('beforebegin', shipping);
    }
    const selectedHeading = document.createElement('h3');
    selectedHeading.className = 'pick-options__selected-heading';
    selectedHeading.textContent = '선택한 옵션';
    selectedHeading.hidden = true;
    totalProducts.insertBefore(selectedHeading, totalProducts.firstChild);
    totalProducts.insertAdjacentElement('afterend', toast);
    let toastTimer = null;

    function quantityUpButton(row) {
      return row && row.querySelector(
        '.quantity .up, .quantity .qtyUp, .quantity .eProductQuantityUpClass, ' +
        '.quantity a[class*="QuantityUp"], .quantity a[class*="qtyUp"], ' +
        '.up.eProductQuantityUpClass, a[data-target$="_up"]'
      );
    }

    let isEnforcingQuantityLimit = false;

    function enforceQuantityLimits() {
      if (isEnforcingQuantityLimit) return false;
      isEnforcingQuantityLimit = true;
      let corrected = false;

      config.bundles.forEach(function enforceBundle(bundle) {
        const state = controller.getState().find(function matchingState(candidate) {
          return candidate.quantity === bundle.quantity;
        });
        const maxCount = state ? state.maxCount : bundle.options.length;
        const optionValues = bundle.options.map(function optionValue(option) { return option.value; });
        const entries = Array.from(totalProducts.querySelectorAll(config.selectors.selectedItemCode))
          .filter(function bundleEntry(input) { return optionValues.includes(input.value); })
          .map(function quantityEntry(input) {
            const row = input.closest('tr');
            const quantityInput = row && row.querySelector('.quantity input, input.quantity_opt');
            return { row: row, input: quantityInput };
          })
          .filter(function validEntry(entry) { return Boolean(entry.input); });

        let remaining = maxCount;
        entries.forEach(function clampEntry(entry, index) {
          const current = Math.max(1, Number(entry.input.value) || 1);
          const remainingRows = entries.length - index - 1;
          const allowed = Math.max(1, Math.min(current, remaining - remainingRows));
          remaining = Math.max(0, remaining - allowed);
          if (current <= allowed) return;

          entry.input.value = String(allowed);
          entry.input.setAttribute('value', String(allowed));
          entry.input.dispatchEvent(new Event('input', { bubbles: true }));
          entry.input.dispatchEvent(new Event('change', { bubbles: true }));
          corrected = true;
        });
      });

      isEnforcingQuantityLimit = false;
      if (corrected) {
        notice.textContent = '같은 개입수는 최대 2회까지 선택할 수 있습니다.';
        window.setTimeout(function quantityCorrectionCompleted() {
          sync();
          renderCompleted();
        }, 0);
      }
      return corrected;
    }
    section.querySelector('#pick-options-heading').textContent = config.ui.heading;
    section.querySelector('.pick-options__description').textContent = config.ui.description;

    function nativeTotalAmount() {
      const amountElement = totalPrice.querySelector('.total strong em, strong.price, .price');
      const amountText = amountElement ? amountElement.textContent : '0';
      const amountMatch = amountText.match(/[0-9][0-9,]*/);
      return amountMatch ? Number(amountMatch[0].replace(/,/g, '')) : 0;
    }

    function nativeFreeShippingThreshold() {
      const deliveryPrice = document.querySelector(config.selectors.deliveryPrice);
      const text = deliveryPrice ? deliveryPrice.textContent : '';
      const match = text.match(/([0-9,]+)원\s*이상[^)]*무료/);
      return match ? Number(match[1].replace(/,/g, '')) : 0;
    }

    function renderShippingProgress() {
      if (!config.shippingProgress.enabled) return;
      const threshold = nativeFreeShippingThreshold();
      shipping.hidden = threshold <= 0;
      if (threshold <= 0) return;
      const amount = nativeTotalAmount();
      const remaining = Math.max(0, threshold - amount);
      const progress = Math.min(100, Math.max(0, (amount / threshold) * 100));
      shipping.querySelector('.pick-options__shipping-fill').style.width = progress + '%';
      shipping.querySelector('.pick-options__shipping-track').setAttribute('aria-valuenow', String(Math.round(progress)));
      const shippingMessage = shipping.querySelector('.pick-options__shipping-copy p');
      if (remaining > 0) {
        shippingMessage.innerHTML = '<em></em> 더 담으면 <strong>무료배송</strong>';
        shippingMessage.querySelector('em').textContent = formatNumber.format(remaining) + '원';
      } else {
        shippingMessage.textContent = config.shippingProgress.completeMessage;
      }
      shipping.querySelector('.pick-options__shipping-threshold').textContent =
        formatNumber.format(threshold) + config.ui.currency;
      shipping.classList.toggle('is-complete', remaining === 0);
    }

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
        document.documentElement.classList.remove('pick-options-flavor-open');
        return;
      }
      const targetUnits = draft.bundle.quantity / config.flavorUnitQuantity;
      const currentUnits = draftTotalUnits();
      flavorPicker.hidden = false;
      document.documentElement.classList.add('pick-options-flavor-open');
      flavorPicker.innerHTML =
        '<div class="pick-options__flavor-head">' +
          '<div><strong class="pick-options__flavor-title"></strong><p class="pick-options__flavor-description"></p></div>' +
          '<button type="button" class="pick-options__flavor-close" aria-label="' + config.ui.cancelLabel + '">×</button>' +
        '</div>' +
        '<div class="pick-options__flavor-list"></div>' +
        '<div class="pick-options__flavor-footer">' +
          '<div class="pick-options__flavor-total-row">' +
            '<span></span><strong class="pick-options__flavor-total"></strong>' +
            '<p class="pick-options__selection-guide" role="status"></p>' +
          '</div>' +
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
          '<span class="pick-options__flavor-info">' +
            '<span class="pick-options__flavor-status"></span>' +
            '<span class="pick-options__flavor-name-row"><strong></strong><em></em></span>' +
            '<small class="pick-options__flavor-nutrition"></small>' +
          '</span>' +
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
        row.querySelector('.pick-options__flavor-name-row em').textContent =
          '(' + (flavor.packQuantity || config.flavorUnitQuantity) + '개입)';
        const nutrition = [];
        if (flavor.calories !== '' && flavor.calories != null) {
          nutrition.push(flavor.calories + 'kcal');
        }
        if (flavor.protein !== '' && flavor.protein != null) {
          nutrition.push('단백질 ' + flavor.protein + 'g');
        }
        row.querySelector('.pick-options__flavor-nutrition').textContent = nutrition.join(', ');
        const status = row.querySelector('.pick-options__flavor-status');
        if (flavor.soldOut) {
          row.classList.add('is-sold-out');
        } else {
          const labels = [];
          if (flavor.isNew) {
            labels.push(config.ui.newLabel);
            status.classList.add('is-new');
          }
          if (flavor.isBest) {
            labels.push(config.ui.bestLabel);
            status.classList.add('is-best');
          }
          status.textContent = labels.join(' · ');
        }
        row.querySelector('output').textContent = count;
        row.querySelector('[data-action="decrease"]').disabled = count === 0;
        row.querySelector('[data-action="increase"]').disabled = flavor.soldOut || currentUnits >= targetUnits;
        list.appendChild(row);
      });
      flavorPicker.querySelector('.pick-options__flavor-total').textContent = template(config.ui.selectedTotalTemplate, {
        current: currentUnits * config.flavorUnitQuantity,
        target: draft.bundle.quantity,
      });
      flavorPicker.querySelector('.pick-options__flavor-total-row span').textContent = config.ui.totalLabel;
      const selectionGuide = flavorPicker.querySelector('.pick-options__selection-guide');
      const remaining = Math.max(0, draft.bundle.quantity - (currentUnits * config.flavorUnitQuantity));
      const guideValues = {
        current: currentUnits * config.flavorUnitQuantity,
        remaining: remaining,
      };
      selectionGuide.textContent = template(config.ui.selectionGuideCurrentTemplate, guideValues);
      const guideEmphasis = document.createElement('strong');
      guideEmphasis.textContent = template(config.ui.selectionGuideRemainingTemplate, guideValues);
      selectionGuide.appendChild(guideEmphasis);
      selectionGuide.appendChild(document.createTextNode(config.ui.selectionGuideSuffix));
      selectionGuide.hidden = remaining === 0;
      const completeButton = flavorPicker.querySelector('.pick-options__complete');
      completeButton.textContent = config.ui.completeLabel;
      completeButton.disabled = currentUnits !== targetUnits;
    }

    function selectedFlavorText(selection) {
      return selection.flavors.map(function flavorText(entry) {
        return entry.name + '(' + config.ui.flavorUnitLabel + ')×' + entry.count;
      }).join(' + ');
    }

    function hasActiveNativeSelection(optionValue) {
      return Array.from(totalProducts.querySelectorAll(
        config.selectors.selectedItemCode + '[value="' + optionValue + '"]'
      )).some(function activeSelection(input) {
        const row = input.closest('tr');
        return Boolean(row && row.isConnected && !row.hidden && window.getComputedStyle(row).display !== 'none');
      });
    }

    function ensureNativeSelection(bundle, optionValue, attempt) {
      const retryDelays = [250, 450, 700];
      window.setTimeout(function retrySwallowedNativeClick() {
        if (hasActiveNativeSelection(optionValue)) return;
        try {
          controller.add(bundle.quantity);
        } catch (error) {
          isSubmitting = false;
          notice.textContent = '옵션을 다시 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.';
          console.error(error);
          return;
        }
        if (attempt + 1 < retryDelays.length) {
          ensureNativeSelection(bundle, optionValue, attempt + 1);
        }
      }, retryDelays[attempt]);
    }

    function showToast(message, tone) {
      window.clearTimeout(toastTimer);
      const icon = toast.querySelector('span');
      const label = toast.querySelector('strong');
      const toastTone = tone || 'success';
      toast.classList.toggle('is-warning', toastTone === 'warning');
      icon.textContent = toastTone === 'warning' ? '!' : '✓';
      label.textContent = message || '선택한 상품이 추가되었습니다';
      toast.hidden = false;
      toast.classList.add('is-visible');
      toastTimer = window.setTimeout(function hideToast() {
        toast.classList.remove('is-visible');
        toast.hidden = true;
      }, 2200);
    }

    function renderCompleted() {
      const nativeSelectedValues = controller.selectedValues();
      for (let index = completedSelections.length - 1; index >= 0; index -= 1) {
        if (completedSelections[index].attached &&
            !nativeSelectedValues.includes(completedSelections[index].optionValue)) {
          completedSelections.splice(index, 1);
        }
      }
      completed.innerHTML = '';
      completedSelections.forEach(function decorateNativeSelection(selection) {
        const input = totalProducts.querySelector(
          config.selectors.selectedItemCode + '[value="' + selection.optionValue + '"]'
        );
        const row = input && input.closest('tr');
        if (!row) return;
        selection.attached = true;
        isSubmitting = false;
        window.clearTimeout(submitUnlockTimer);
        row.classList.add('pick-options__native-item');
        const firstCell = row.querySelector('td');
        if (!firstCell) return;
        let summary = firstCell.querySelector('.pick-options__native-summary');
        if (!summary) {
          summary = document.createElement('div');
          summary.className = 'pick-options__native-summary';
          summary.innerHTML = '<strong></strong><p></p>';
          firstCell.appendChild(summary);
        }
        const summaryTitle = summary.querySelector('strong');
        const summaryDescription = summary.querySelector('p');
        const description = selectedFlavorText(selection);
        if (summaryTitle.textContent !== selection.bundle.label) {
          summaryTitle.textContent = selection.bundle.label;
        }
        if (summaryDescription.textContent !== description) {
          summaryDescription.textContent = description;
        }
        const deleteImage = row.querySelector('.option_box_del');
        if (deleteImage && deleteImage.parentElement) {
          deleteImage.parentElement.classList.add('pick-options__native-delete');
          deleteImage.alt = '선택상품 삭제';
        }
        const nativeQuantityInput = row.querySelector('.quantity input, input.quantity_opt');
        if (nativeQuantityInput) {
          if (!nativeQuantityInput.value) nativeQuantityInput.value = '1';
          nativeQuantityInput.setAttribute('aria-label', '선택상품 수량');
          if (nativeQuantityInput.parentElement) {
            nativeQuantityInput.parentElement.classList.add('pick-options__native-quantity');
          }
        }
      });
      selectedHeading.hidden = controller.selectedValues().length === 0;
    }

    function syncNativeQuantityControls() {
      Array.from(totalProducts.querySelectorAll(config.selectors.selectedItemCode)).forEach(function syncRow(input) {
        const row = input.closest('tr');
        const up = quantityUpButton(row);
        const state = controller.stateForOptionValue(input.value);
        if (!up || !state) return;
        const limited = state.selectedCount >= state.maxCount;
        up.classList.toggle('is-limit-disabled', limited);
        up.setAttribute('aria-disabled', String(limited));
        if (limited) {
          up.setAttribute('tabindex', '-1');
        } else {
          up.removeAttribute('tabindex');
        }
      });
    }

    function sync() {
      const states = controller.getState();
      states.forEach(function syncCard(state) {
        const card = cards.querySelector('[data-quantity="' + state.quantity + '"]');
        const count = card.querySelector('.pick-options__count');
        const draftSelected = Boolean(draft && draft.bundle.quantity === state.quantity);
        card.classList.toggle('is-selected', draftSelected);
        card.classList.toggle('is-complete', state.complete);
        card.disabled = state.complete || state.unavailable;
        card.setAttribute('aria-pressed', String(draftSelected));
        count.textContent = state.unavailable
          ? config.ui.soldOutLabel
          : template(config.ui.countTemplate, {
            selected: state.selectedCount,
            max: state.maxCount,
          });
      });
      syncNativeQuantityControls();
      renderShippingProgress();
      emit(config.events.selectionChange, { states: states });
    }

    cards.addEventListener('click', function handleCardClick(event) {
      const card = event.target.closest('[data-quantity]');
      if (!card || card.disabled || isSubmitting) return;
      notice.textContent = '';
      const bundle = config.bundles.find(function findBundle(candidate) {
        return candidate.quantity === Number(card.dataset.quantity);
      });
      draft = { bundle: bundle, counts: {} };
      renderFlavorPicker();
      sync();
      flavorPicker.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    flavorPicker.addEventListener('click', function handleFlavorClick(event) {
      if (!draft) return;
      if (event.target.closest('.pick-options__flavor-close')) {
        draft = null;
        renderFlavorPicker();
        sync();
        return;
      }
      const completeButton = event.target.closest('.pick-options__complete');
      if (completeButton && !completeButton.disabled) {
        if (isSubmitting) return;
        isSubmitting = true;
        completeButton.disabled = true;
        const flavors = config.flavors.map(function selectedFlavor(flavor) {
          return { id: flavor.id, name: flavor.name, count: draft.counts[flavor.id] || 0 };
        }).filter(function hasCount(flavor) { return flavor.count > 0; });
        const bundle = draft.bundle;
        let optionValue = false;
        try {
          optionValue = controller.add(bundle.quantity);
        } catch (error) {
          isSubmitting = false;
          notice.textContent = '옵션을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.';
          console.error(error);
          return;
        }
        if (optionValue) {
          // 삭제 후 같은 suffix를 재사용할 때 남아 있는 이전 UI 메타데이터만 제거한다.
          // 서로 다른 suffix(_1, _2)는 맛 구성이 같아도 각각 정상적으로 유지한다.
          for (let index = completedSelections.length - 1; index >= 0; index -= 1) {
            if (completedSelections[index].optionValue === optionValue) {
              completedSelections.splice(index, 1);
            }
          }
          completedSelections.push({
            bundle: bundle,
            flavors: flavors,
            optionValue: optionValue,
            attached: false,
          });
          renderCompleted();
          showToast('선택한 상품이 추가되었습니다', 'success');
          ensureNativeSelection(bundle, optionValue, 0);
          submitUnlockTimer = window.setTimeout(function unlockStalledSubmission() {
            isSubmitting = false;
            sync();
          }, 1200);
        } else {
          isSubmitting = false;
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
      const flavor = config.flavors.find(function findFlavor(candidate) {
        return candidate.id === id;
      });
      if (action.dataset.action === 'increase' && flavor && !flavor.soldOut && draftTotalUnits() < targetUnits) {
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

    document.addEventListener('click', function guardPurchaseWithoutOption(event) {
      const purchaseButton = event.target.closest(config.selectors.purchaseButton);
      if (!purchaseButton || controller.selectedValues().length > 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast(config.ui.selectOptionMessage, 'warning');
    }, true);

    totalProducts.addEventListener('click', function guardNativeQuantity(event) {
      const down = event.target.closest(
        '.quantity .down, .quantity .qtyDown, .quantity .eProductQuantityDownClass, ' +
        '.quantity a[class*="QuantityDown"], .quantity a[class*="qtyDown"], ' +
        '.down.eProductQuantityDownClass, a[data-target$="_down"]'
      );
      if (down) {
        const row = down.closest('tr');
        const quantityInput = row && row.querySelector('.quantity input, input.quantity_opt');
        if (quantityInput && (Number(quantityInput.value) || 1) <= 1) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showToast(config.ui.minimumQuantityMessage, 'warning');
          return;
        }
      }

      const up = event.target.closest(
        '.quantity .up, .quantity .qtyUp, .quantity .eProductQuantityUpClass, ' +
        '.quantity a[class*="QuantityUp"], .quantity a[class*="qtyUp"], ' +
        '.up.eProductQuantityUpClass, a[data-target$="_up"]'
      );
      if (up) {
        const row = up.closest('tr');
        const itemCode = row && row.querySelector(config.selectors.selectedItemCode);
        const state = itemCode && controller.stateForOptionValue(itemCode.value);
        if (state && state.selectedCount >= state.maxCount) {
          event.preventDefault();
          event.stopImmediatePropagation();
          notice.textContent = '해당 개입수는 최대 ' + state.maxCount + '회까지 선택할 수 있습니다.';
          return;
        }
      }
      window.setTimeout(function quantityClickCompleted() {
        enforceQuantityLimits();
        sync();
        renderCompleted();
      }, 60);
    }, true);

    totalProducts.addEventListener('input', function clampNativeQuantity(event) {
      const quantityInput = event.target.closest('.quantity input, input.quantity_opt');
      if (!quantityInput) return;
      const row = quantityInput.closest('tr');
      const itemCode = row && row.querySelector(config.selectors.selectedItemCode);
      const state = itemCode && controller.stateForOptionValue(itemCode.value);
      if (!state) return;
      if (!quantityInput.value || Number(quantityInput.value) < 1) {
        window.setTimeout(function restoreMinimumQuantity() {
          quantityInput.value = '1';
          quantityInput.setAttribute('value', '1');
          quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
          quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
          enforceQuantityLimits();
          sync();
          renderCompleted();
        }, 0);
        return;
      }
      const current = Math.max(1, Number(quantityInput.value) || 1);
      const ownEntry = Array.from(totalProducts.querySelectorAll(config.selectors.selectedItemCode))
        .find(function sameRow(input) { return input.closest('tr') === row; });
      const ownQuantity = ownEntry ? current : 0;
      const otherUsed = Math.max(0, state.selectedCount - ownQuantity);
      const allowed = Math.max(1, state.maxCount - otherUsed);
      if (current > allowed) quantityInput.value = String(allowed);
      window.setTimeout(function quantityInputCompleted() {
        enforceQuantityLimits();
        sync();
        renderCompleted();
      }, 0);
    }, true);

    totalProducts.addEventListener('change', function quantityChangeCompleted(event) {
      if (!event.target.closest('.quantity input, input.quantity_opt')) return;
      window.setTimeout(function enforceChangedQuantity() {
        enforceQuantityLimits();
        sync();
        renderCompleted();
      }, 0);
    }, true);

    const observer = new MutationObserver(function selectedProductsChanged() {
      enforceQuantityLimits();
      sync();
      renderCompleted();
    });
    observer.observe(totalProducts, { childList: true, subtree: true });

    const totalPriceObserver = new MutationObserver(renderShippingProgress);
    totalPriceObserver.observe(totalPrice, { childList: true, subtree: true, characterData: true });

    sync();
    renderShippingProgress();
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
    const totalPrice = document.querySelector(config.selectors.totalPrice);
    if (optionTables.length !== 1 || optionLists.length !== 1 || optionSelects.length !== 1 || !totalProducts || !totalPrice) {
      console.error('[pick-options] 필요한 카페24 옵션 DOM을 찾지 못했습니다.');
      return;
    }

    const adapter = createNativeAdapter(optionLists[0], optionSelects[0], totalProducts);
    const controller = createController(adapter);
    const element = createInterface(controller, optionTables[0], totalProducts, totalPrice);
    window.PickOptions = controller;
    emit(config.events.ready, { controller: controller, element: element });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
