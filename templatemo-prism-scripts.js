// JavaScript Document

/*

TemplateMo 600 Prism Flux

https://templatemo.com/tm-600-prism-flux

*/


// Portfolio data for gallery

        const portfolioData = [
            {
                id: 1,
                title: 'Look 01',
                description: 'Silhouette futuristica in satin con bagliori metallici e dettagli geometrici.',
                image: 'images/Thanny006.jpg',
                tech: ['Haute Couture', 'Metallic Glow', 'Runway Ready']
            },
            {
                id: 2,
                title: 'Look 02',
                description: 'Tailleur strutturato con texture iper-luminose che enfatizzano le linee sartoriali.',
                image: 'images/Thanny024.jpg',
                tech: ['Structured Fit', 'Satin Finish', 'Studio Shot']
            },
            {
                id: 3,
                title: 'Look 03',
                description: 'Dress scultoreo con cintura gioiello e contrasto tra volumi morbidi e rigidi.',
                image: 'images/Thanny03.jpg',
                tech: ['Evening Wear', 'Golden Hue', 'Editorial Mood']
            },
            {
                id: 4,
                title: 'Look 04',
                description: 'Completo metallico a spalle pronunciate, pensato per un impatto scenografico.',
                image: 'images/Thanny034.jpg',
                tech: ['Power Suit', 'Metal Mesh', 'Stage Lights']
            },
            {
                id: 5,
                title: 'Look 05',
                description: 'Abito longline con pannelli fluidi e sfumature soft per un movimento etereo.',
                image: 'images/Thanny036.jpg',
                tech: ['Flowing Layers', 'Soft Gradient', 'Motion Ready']
            },
            {
                id: 6,
                title: 'Look 06',
                description: 'Mini dress iridescente che rifrange la luce con texture digitali e moderne.',
                image: 'images/Thanny054.jpg',
                tech: ['Iridescent', 'Digital Texture', 'Night Out']
            },
            {
                id: 7,
                title: 'Look 07',
                description: 'Abito drappeggiato con tagli diagonali e finiture luminose tono su tono.',
                image: 'images/Thanny16.jpg',
                tech: ['Draped Lines', 'Tone on Tone', 'Studio Light']
            },
            {
                id: 8,
                title: 'Look 08',
                description: 'Coordinato sartoriale con gilet e pantapalazzo, impreziosito da dettagli metallici.',
                image: 'images/Thanny34.jpg',
                tech: ['Tailored', 'Metal Details', 'Urban Glow']
            },
            {
                id: 9,
                title: 'Look 09',
                description: 'Outfit a contrasto cromatico con texture lucide e volumi morbidi per equilibrio dinamico.',
                image: 'images/Thanny43.jpg',
                tech: ['Color Contrast', 'Gloss Finish', 'Soft Volume']
            }
        ];

        // Gallery populated from portfolioData via initGallery().

        // Scroll to section function
        function scrollToSection(sectionId) {
            const section = document.getElementById(sectionId);
            const header = document.getElementById('header');
            if (section) {
                const headerHeight = header.offsetHeight;
                const targetPosition = section.offsetTop - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }

        // Helper to call local proxy for AI generation (payload shape depends on provider).
        async function requestVirtualShoot(payload) {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            return contentType.includes('application/json') ? response.json() : response.text();
        }

        function initHeroSlideshow() {
            const slides = document.querySelectorAll('.saas-hero__slide');
            if (slides.length < 2) return;

            let activeIndex = 0;

            setInterval(() => {
                slides[activeIndex].classList.remove('is-active');
                activeIndex = (activeIndex + 1) % slides.length;
                slides[activeIndex].classList.add('is-active');
            }, 3200);
        }

        function initInstantPreviewSection() {
            const input = document.getElementById('instantPreviewInput');
            const dropzone = document.getElementById('instantPreviewDropzone');
            const uploadState = document.getElementById('instantPreviewUploadState');
            const garmentPreview = document.getElementById('instantPreviewGarmentPreview');
            const garmentImage = document.getElementById('instantPreviewGarmentImage');
            const emptyState = document.getElementById('instantPreviewEmptyState');
            const loadingState = document.getElementById('instantPreviewLoading');
            const loadingText = document.getElementById('instantPreviewLoadingText');
            const resultContent = document.getElementById('instantPreviewResultContent');
            const resultImage = document.getElementById('instantPreviewResultImage');
            const variations = document.getElementById('instantPreviewVariations');
            const variationOne = document.getElementById('instantPreviewVariationOne');
            const variationTwo = document.getElementById('instantPreviewVariationTwo');
            const cta = document.getElementById('instantPreviewCta');
            const generateButton = document.getElementById('instantPreviewGenerateButton');
            const variationOneCard = variationOne?.parentElement;
            const variationTwoCard = variationTwo?.parentElement;

            if (!input || !dropzone || !uploadState || !garmentPreview || !garmentImage || !emptyState || !loadingState || !loadingText || !resultContent || !resultImage || !variations || !variationOne || !variationTwo || !cta || !generateButton || !variationOneCard || !variationTwoCard) {
                return;
            }

            const PRESET_MODEL_SRC = 'images/models/Nicole.jpeg';
            const PRESET_PROMPT = 'the model in the image 1 wearing the outfit in the image 2';
            const PRESET_STYLE_PROMPT = 'realistic fashion editorial portrait, studio lighting, high contrast shadows, glossy skin highlights, dramatic posing, Vogue-style composition, medium format camera look, impeccable detail, sharp eyes, textured clothing';
            const PRESET_BACKGROUND_PROMPT = 'high-end fashion editorial background, luxury set design, dramatic sculpted lighting, refined textures, premium magazine-style art direction';
            const PRESET_ASPECT_RATIO = '4:3';
            const loadingMessages = [
                'Waiting input image',
                'Applying style...',
                'Finalizing details...',
            ];
            let previewUrl = null;
            let generationToken = 0;
            let selectedGarmentFile = null;
            let hasGeneratedOnce = false;

            const resetResultVisibility = () => {
                emptyState.hidden = true;
                loadingState.hidden = true;
                resultContent.hidden = true;
                variations.hidden = true;
                cta.hidden = true;
                generateButton.disabled = hasGeneratedOnce || !selectedGarmentFile;
            };

            const showEmptyState = () => {
                emptyState.hidden = false;
                loadingState.hidden = true;
                resultContent.hidden = true;
                variations.hidden = true;
                cta.hidden = true;
                variationOne.removeAttribute('src');
                variationTwo.removeAttribute('src');
                variationOneCard.hidden = true;
                variationTwoCard.hidden = true;
                generateButton.hidden = hasGeneratedOnce;
                generateButton.disabled = hasGeneratedOnce || !selectedGarmentFile;
            };

            const setGarmentPreview = (file) => {
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    previewUrl = null;
                }

                if (!file) {
                    selectedGarmentFile = null;
                    garmentPreview.hidden = true;
                    uploadState.hidden = false;
                    garmentImage.removeAttribute('src');
                    showEmptyState();
                    return;
                }

                selectedGarmentFile = file;
                previewUrl = URL.createObjectURL(file);
                garmentImage.src = previewUrl;
                garmentPreview.hidden = false;
                uploadState.hidden = true;
                generateButton.hidden = hasGeneratedOnce;
                generateButton.disabled = hasGeneratedOnce || !selectedGarmentFile;
            };

            const normalizeGeneratedUrl = (value) => {
                if (!value || typeof value !== 'string') return '';
                return value.startsWith('http')
                    ? value
                    : `${window.location.origin}/${value.replace(/^\/+/, '')}`;
            };

            const fileToDataUrl = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(file);
                });

            const buildPresetPrompt = () =>
                `${PRESET_PROMPT}, style: ${PRESET_STYLE_PROMPT}, background: ${PRESET_BACKGROUND_PROMPT}`;

            const runGeneration = async (file) => {
                generationToken += 1;
                const currentToken = generationToken;
                resetResultVisibility();
                generateButton.disabled = true;
                loadingState.hidden = false;
                loadingText.textContent = loadingMessages[0];

                const start = Date.now();
                let messageIndex = 0;
                const intervalId = window.setInterval(() => {
                    messageIndex = (messageIndex + 1) % loadingMessages.length;
                    loadingText.textContent = loadingMessages[messageIndex];
                }, 1700);

                try {
                    const dressDataUrl = await fileToDataUrl(file);
                    const modelImage = `${window.location.origin}/${PRESET_MODEL_SRC.replace(/^\/+/, '')}`;
                    const prompt = buildPresetPrompt();
                    const inputPayload = {
                        prompt,
                        image_input: [modelImage, dressDataUrl],
                        output_format: 'jpg',
                        aspect_ratio: PRESET_ASPECT_RATIO,
                    };
                    const [response] = await Promise.all([
                        requestVirtualShoot({ input: inputPayload }),
                        new Promise((resolve) => setTimeout(resolve, 1650)),
                    ]);

                    window.clearInterval(intervalId);

                    if (currentToken !== generationToken) {
                        return;
                    }

                    const saved = Array.isArray(response?.saved) ? response.saved : [];
                    const output = Array.isArray(response?.output) ? response.output : [];
                    const generated = [...saved, ...output]
                        .map(normalizeGeneratedUrl)
                        .filter(Boolean);

                    if (!generated.length) {
                        throw new Error('No generated images returned');
                    }

                    const elapsed = Date.now() - start;
                    if (elapsed < 1500) {
                        await new Promise((resolve) => setTimeout(resolve, 1500 - elapsed));
                    }

                    resultImage.src = generated[0];
                    resultImage.alt = 'Generated preview result';
                    resultContent.hidden = false;
                    hasGeneratedOnce = true;
                    generateButton.hidden = true;
                    generateButton.disabled = true;

                    if (generated[1]) {
                        variationOne.src = generated[1];
                        variationOne.alt = 'Result variation 1';
                        variationOneCard.hidden = false;
                    }
                    if (generated[2]) {
                        variationTwo.src = generated[2];
                        variationTwo.alt = 'Result variation 2';
                        variationTwoCard.hidden = false;
                    }
                    variations.hidden = !(generated[1] || generated[2]);
                    cta.hidden = false;
                    loadingState.hidden = true;
                    generateButton.disabled = false;
                } catch (error) {
                    window.clearInterval(intervalId);
                    if (currentToken !== generationToken) {
                        return;
                    }

                    console.error('Instant preview generation failed', error);
                    loadingState.hidden = true;
                    emptyState.hidden = false;
                    emptyState.innerHTML = `
                        <p class="instant-preview__result-empty-title">Unable to generate preview</p>
                        <p class="instant-preview__result-empty-copy">Try another garment image in JPG or PNG format.</p>
                    `;
                    generateButton.disabled = !selectedGarmentFile;
                }
            };

            const handleFileSelection = (file) => {
                if (!file || !file.type.startsWith('image/')) {
                    return;
                }

                setGarmentPreview(file);
                emptyState.innerHTML = `
                    <p class="instant-preview__result-empty-title">Your preview will appear here</p>
                    <p class="instant-preview__result-empty-copy">Your garment is ready. Click "Create your shoot" to start the preview.</p>
                `;
                showEmptyState();
            };

            input.addEventListener('change', (event) => {
                const file = event.target.files && event.target.files[0];
                handleFileSelection(file);
            });

            ['dragenter', 'dragover'].forEach((eventName) => {
                dropzone.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    dropzone.classList.add('is-dragover');
                });
            });

            ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
                dropzone.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    dropzone.classList.remove('is-dragover');
                });
            });

            dropzone.addEventListener('drop', (event) => {
                const file = event.dataTransfer?.files && event.dataTransfer.files[0];
                if (!file) return;

                const transfer = new DataTransfer();
                transfer.items.add(file);
                input.files = transfer.files;
                handleFileSelection(file);
            });

            generateButton.addEventListener('click', async () => {
                if (!selectedGarmentFile || generateButton.disabled) {
                    return;
                }

                await runGeneration(selectedGarmentFile);
            });

            showEmptyState();
        }

        function initProblemSolutionReveal() {
            const section = document.querySelector('.problem-solution-section');
            if (!section) return;

            const items = section.querySelectorAll('[data-problem-solution-item]');
            if (!items.length) return;

            if (!('IntersectionObserver' in window)) {
                items.forEach((item) => item.classList.add('is-visible'));
                return;
            }

            const revealObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    items.forEach((item, index) => {
                        item.style.transitionDelay = `${index * 90}ms`;
                        item.classList.add('is-visible');
                    });

                    observer.unobserve(entry.target);
                });
            }, {
                threshold: 0.2,
                rootMargin: '0px 0px -10% 0px'
            });

            revealObserver.observe(section);
        }

        function initFaqAccordion() {
            const faqItems = document.querySelectorAll('.faq__item');
            if (!faqItems.length) return;

            faqItems.forEach((item) => {
                const button = item.querySelector('.faq__question');
                if (!button) return;

                button.addEventListener('click', () => {
                    const isOpen = item.classList.contains('is-open');

                    faqItems.forEach((faqItem) => {
                        faqItem.classList.remove('is-open');
                        const faqButton = faqItem.querySelector('.faq__question');
                        if (faqButton) {
                            faqButton.setAttribute('aria-expanded', 'false');
                        }
                    });

                    if (!isOpen) {
                        item.classList.add('is-open');
                        button.setAttribute('aria-expanded', 'true');
                    }
                });
            });
        }

        // Initialize gallery grid
        function initGallery() {
            const galleryGrid = document.getElementById('galleryGrid');
            if (!galleryGrid) return;

            galleryGrid.innerHTML = '';

            portfolioData.forEach((item, index) => {
                const hex = document.createElement('div');
                hex.className = 'gallery-hexagon';
                hex.style.animationDelay = `${index * 0.1}s`;

                hex.innerHTML = `
                    <div class="gallery-hex-inner">
                        <div class="gallery-hex-content">
                            <div class="gallery-thumb">
                                <img src="${item.image}" alt="${item.title}">
                            </div>
                            <div class="gallery-title">${item.title}</div>
                            <div class="gallery-desc">${item.description}</div>
                        </div>
                    </div>
                `;

                galleryGrid.appendChild(hex);
            });
        }

        async function generateLook(settings = {}) {
            const garmentTemplates = {
                dress: 'the model in the image 1 wearing the outfit in the image 2',
                top: 'the model in the image 1 wearing the top in the image 2',
                trousers: 'the model in the image 1 wearing the trousers in the image 2',
                skirt: 'the model in the image 1 wearing the skirt in the image 2',
                accessory: 'luxury product photography',
            };

            const bgChoice = settings.background || 'studio';
            const bgCustom = settings.backgroundPrompt || '';
            const bgText = bgCustom ? `${bgChoice} with details: ${bgCustom}` : bgChoice;
            const garmentType = settings.dressType || 'dress';
            const garmentTemplate = garmentTemplates[garmentType] || garmentTemplates.dress;
            const promptMessage = `${garmentTemplate}, background: ${bgText}`;
            window.generatedPrompt = promptMessage;

            const rawModelImage = settings.modelDataUrl;
            const dressImage = settings.dressDataUrl;
            const isAccessory = (settings.dressType || 'dress') === 'accessory';

            if (!dressImage) {
                alert('Carica abito e modello prima di generare.');
                return;
            }

            const modelImage =
                rawModelImage && !rawModelImage.startsWith('data:') && !rawModelImage.startsWith('http')
                    ? `${window.location.origin}/${rawModelImage.replace(/^\/+/, '')}`
                    : rawModelImage;

            const hasModel = !!modelImage;
            if (!isAccessory && !hasModel) {
                alert('Carica o scegli una modella per generare il look.');
                return;
            }

            const imageInput = isAccessory ? [dressImage] : [modelImage, dressImage];
            const input = {
                prompt: promptMessage,
                image_input: imageInput,
                output_format: 'jpg',
                aspect_ratio: settings.aspect || '1:1',
            };
            window.lastGenerateInput = input;

            try {
                showGenLoader();
                const resp = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input }),
                });
                if (resp.status === 429) {
                    alert('Limite di richieste raggiunto. Attendi qualche secondo e riprova.');
                    console.warn('[generate] Limite di richieste raggiunto (429). Riprova tra qualche secondo.');
                    return;
                }
                if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(`Errore API (${resp.status}): ${txt}`);
                }
                const data = await resp.json();
                const saved = data?.saved || [];
                const output = data?.output || [];
                const first = saved[0] || output[0];
                if (first) {
                    const full =
                        first.startsWith('http')
                            ? first
                            : `${window.location.origin}/${first.replace(/^\/+/, '')}`;
                    showImageViewer(full);
                }
            } catch (err) {
                console.error('Replicate generate failed', err);
            } finally {
                hideGenLoader();
            }
        }

        // Upload modal interactions
        function initUploadModal() {
            const modal = document.getElementById('uploadModal');
            const backdrop = document.getElementById('uploadBackdrop');
            const closeBtn = document.getElementById('uploadClose');
            const submitBtn = document.getElementById('uploadSubmit');
            const dressInput = document.getElementById('dressInput');
            const dressTypeOptions = Array.from(document.querySelectorAll('#dressTypeOptions .dress-type-btn'));
            const aspectSelect = document.getElementById('aspectSelect');
            const backgroundSelect = document.getElementById('backgroundSelect');
            const backgroundPrompt = document.getElementById('backgroundPrompt');
            const modelInput = document.getElementById('modelInput');
            const dressPreview = document.getElementById('dressPreview');
            const modelPreview = document.getElementById('modelPreview');
            const dressDropzone = dressInput?.closest('.upload-dropzone');
            const modelDropzone = modelInput?.closest('.upload-dropzone');
            const readyCards = Array.from(document.querySelectorAll('.model-ready-card'));
            const accessorySuggestions = [
                'Product detail shot (on model)',
                'Cropped décolleté shot',
                'jewelry e-commerce',
                'luxury product photography',
            ];
            let suggestionContainer = null;
            let selectedReadyModel = null;
            let uploadSelection = null;
            let confirmAnimMounted = false;
            let selectedDressType = 'dress';
            let modalMode = 'default';

            if (!modal) return;

            const setDressTypeValue = (type) => {
                selectedDressType = type || 'dress';
                dressTypeOptions.forEach((b) => b.classList.toggle('active', b.dataset.type === selectedDressType));
            };

            const setAccessoryMode = (isAccessoryMode) => {
                modalMode = isAccessoryMode ? 'accessory' : 'default';
                if (isAccessoryMode) {
                    setDressTypeValue('accessory');
                    if (modelInput) modelInput.value = '';
                    if (modelPreview) modelPreview.innerHTML = '';
                    modelDropzone?.classList.remove('has-image');
                    if (modelDropzone) modelDropzone.style.display = 'none';
                } else {
                    setDressTypeValue('dress');
                    if (modelDropzone) modelDropzone.style.display = '';
                }
                toggleSubmit();
            };

            const ensureSuggestionContainer = () => {
                if (suggestionContainer) return;
                const accessoryBtn = dressTypeOptions.find((b) => b.dataset.type === 'accessory');
                const parent = accessoryBtn?.parentNode;
                if (!parent) return;
                suggestionContainer = document.createElement('div');
                suggestionContainer.className = 'prompt-suggestions';
                accessorySuggestions.forEach((text) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'prompt-suggestion-btn';
                    btn.textContent = text;
                    btn.addEventListener('click', () => {
                        const current = (backgroundPrompt.value || '').trim();
                        backgroundPrompt.value = current ? `${current}; ${text}` : text;
                        backgroundPrompt.focus();
                    });
                    suggestionContainer.appendChild(btn);
                });
                accessoryBtn.insertAdjacentElement('afterend', suggestionContainer);
            };

            const updateSuggestionsVisibility = () => {
                ensureSuggestionContainer();
                if (!suggestionContainer) return;
                suggestionContainer.style.display = selectedDressType === 'accessory' ? 'flex' : 'none';
            };

            const toggleSubmit = () => {
                const isAccessory = selectedDressType === 'accessory';
                const hasDress = !!dressInput?.files?.length || dressDropzone?.classList.contains('has-image');
                const hasModelUpload = !!modelInput?.files?.length;
                const hasReadyModel = !!selectedReadyModel || modelDropzone?.classList.contains('has-image');
                submitBtn.disabled = isAccessory
                    ? !hasDress
                    : !(hasDress && (hasModelUpload || hasReadyModel));
            };

            const clearReadySelection = () => {
                readyCards.forEach((card) => card.classList.remove('active'));
            };

            const setReadyModel = (src, name) => {
                if (!modelPreview || !modelDropzone) return;
                modelPreview.innerHTML = `<img src="${src}" alt="${name || 'Modella pronta'}">`;
                modelDropzone.classList.add('has-image');
                selectedReadyModel = src;
                if (modelInput) modelInput.value = '';
                clearReadySelection();
                readyCards
                    .find((card) => card.dataset.modelSrc === src)
                    ?.classList.add('active');
                toggleSubmit();
            };

            const setPreview = (input, previewEl, dropzone, { clearReady } = { clearReady: false }) => {
                if (!input || !previewEl || !dropzone) return;
                if (input.files && input.files.length) {
                    const file = input.files[0];
                    const url = URL.createObjectURL(file);
                    previewEl.innerHTML = `<img src="${url}" alt="Anteprima">`;
                    dropzone.classList.add('has-image');
                    if (clearReady) {
                        selectedReadyModel = null;
                        clearReadySelection();
                    }
                } else {
                    previewEl.innerHTML = '';
                    dropzone.classList.remove('has-image');
                }
                toggleSubmit();
                updateSuggestionsVisibility();
            };

            const openModal = (mode = 'default') => {
                if (mode === 'accessory') {
                    setAccessoryMode(true);
                } else {
                    setAccessoryMode(false);
                }
                modal.classList.add('active');
                toggleSubmit();
                updateSuggestionsVisibility();
            };
            const closeModal = () => modal.classList.remove('active');

            dressTypeOptions.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectedDressType = btn.dataset.type || 'dress';
                    dressTypeOptions.forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (selectedDressType !== 'accessory' && modelDropzone) {
                        modelDropzone.style.display = '';
                    }
                    toggleSubmit();
                    updateSuggestionsVisibility();
                });
            });

            backdrop?.addEventListener('click', closeModal);
            closeBtn?.addEventListener('click', closeModal);
            dressInput?.addEventListener('change', () => setPreview(dressInput, dressPreview, dressDropzone));
            modelInput?.addEventListener('change', () => setPreview(modelInput, modelPreview, modelDropzone, { clearReady: true }));
            readyCards.forEach((card) => {
                card.addEventListener('click', () => {
                    const src = card.dataset.modelSrc;
                    const name = card.dataset.modelName;
                    if (src) setReadyModel(src, name);
                });
            });

            const fileToDataUrl = (file) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(file);
                });

            submitBtn?.addEventListener('click', async () => {
                const isAccessory = selectedDressType === 'accessory';
                const hasDress = !!dressInput?.files?.length;
                const hasModel = !!modelInput?.files?.length || !!selectedReadyModel;
                if (!hasDress) return;
                if (!isAccessory && !hasModel) return;
                submitBtn.disabled = true;
                try {
                    const dressFile = dressInput.files[0];
                    const dressDataUrl = await fileToDataUrl(dressFile);

                    let modelDataUrl = selectedReadyModel;
                    let modelSource = 'library';
                    if (modelInput?.files?.length) {
                        modelDataUrl = await fileToDataUrl(modelInput.files[0]);
                        modelSource = 'upload';
                    }

                    uploadSelection = {
                        dressDataUrl,
                        modelDataUrl,
                        modelSource,
                        dressType: selectedDressType || 'dress',
                        aspect: aspectSelect?.value || '1:1',
                        background: backgroundSelect?.value || 'studio',
                        backgroundPrompt: backgroundPrompt?.value?.trim() || '',
                    };
                    window.uploadSelection = uploadSelection;

                    await generateLook(uploadSelection);
                } catch (err) {
                    console.error('Upload capture failed', err);
                } finally {
                    submitBtn.disabled = false;
                    closeModal();
                }
            });
        }
        // Image viewer
        const viewer = document.getElementById('imageViewer');
        const viewerImg = document.getElementById('imageViewerImg');
        const viewerLink = document.getElementById('imageViewerLink');
        const viewerClose = document.getElementById('imageViewerClose');
        const viewerBackdrop = document.getElementById('imageViewerBackdrop');
        const viewerSave = document.getElementById('imageViewerSave');
        const viewerPose = document.getElementById('imageViewerPose');
        const viewerBg = document.getElementById('imageViewerBg');
        const viewerRegen = document.getElementById('imageViewerRegen');

        const showImageViewer = (url) => {
            if (!viewer || !viewerImg || !viewerLink) return;
            viewerImg.src = url;
            viewerLink.href = url;
            viewer.classList.add('active');
        };

        const hideImageViewer = () => {
            viewer?.classList.remove('active');
            if (viewerImg) viewerImg.src = '';
            if (viewerLink) viewerLink.href = '#';
        };

        viewerClose?.addEventListener('click', hideImageViewer);
        viewerBackdrop?.addEventListener('click', hideImageViewer);
        viewerSave?.addEventListener('click', hideImageViewer);
        const FIXED_POSE_PROMPT = `Modify the pose and camera framing of the subject while preserving the original image identity, outfit, garment details, proportions, colors, and overall visual consistency.

The garment must remain unchanged in shape, fit, texture, and structure.

Generate a natural fashion pose, choosing randomly but realistically between:
- standing relaxed pose (weight shifted, one leg slightly forward)
- slight walking motion
- subtle contrapposto pose
- upper body fashion pose (hands near face or waist)
- seated elegant pose (if composition allows)

Camera framing: choose one:
- full body shot
- 3/4 shot
- waist-up shot

Camera angle: slightly vary between:
- eye-level
- slight low angle
- slight high angle

Pose must remain believable, balanced, and physically correct.

Expression: neutral, confident, or softly natural (no exaggerated emotions).

Lighting: keep consistent with the original image.

Background: preserve original environment and perspective.

Style: realistic fashion photography, clean, professional.

Do not introduce distortions, extra elements, text, or changes to the clothing.`;

        viewerPose?.addEventListener('click', async () => {
            const currentSrc = viewerImg?.src;
            if (!currentSrc) {
                alert('Nessuna immagine da usare per cambiare posa.');
                return;
            }
            const aspect = window.lastGenerateInput?.aspect_ratio || '1:1';
            const input = {
                prompt: FIXED_POSE_PROMPT,
                image_input: [currentSrc],
                output_format: 'jpg',
                aspect_ratio: aspect,
            };
            showGenLoader();
            try {
                const resp = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input }),
                });
                if (resp.status === 429) {
                    alert('Limite di richieste raggiunto. Attendi qualche secondo e riprova.');
                    console.warn('[pose] Limite di richieste raggiunto (429). Riprova tra qualche secondo.');
                    return;
                }
                if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(`Errore API (${resp.status}): ${txt}`);
                }
                const data = await resp.json();
                const saved = data?.saved || [];
                const output = data?.output || [];
                const first = saved[0] || output[0];
                if (first && viewerImg && viewerLink) {
                    const full =
                        first.startsWith('http')
                            ? first
                            : `${window.location.origin}/${first.replace(/^\/+/, '')}`;
                    viewerImg.src = full;
                    viewerLink.href = full;
                    showImageViewer(full);
                }
            } catch (err) {
                console.error('Cambio posa fallito', err);
                alert('Cambio posa fallito. Riprova tra poco.');
            } finally {
                hideGenLoader();
            }
        });
        viewerBg?.addEventListener('click', hideImageViewer);
        viewerRegen?.addEventListener('click', async () => {
            const lastInput = window.lastGenerateInput;
            if (!lastInput) {
                alert('Nessuna generazione precedente da rigenerare.');
                return;
            }
            showGenLoader();
            try {
                const resp = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: lastInput }),
                });
                if (resp.status === 429) {
                    alert('Limite di richieste raggiunto. Attendi qualche secondo e riprova.');
                    console.warn('[generate/regen] Limite di richieste raggiunto (429). Riprova tra qualche secondo.');
                    return;
                }
                if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(`Errore API (${resp.status}): ${txt}`);
                }
                const data = await resp.json();
                const saved = data?.saved || [];
                const output = data?.output || [];
                const first = saved[0] || output[0];
                if (first && viewerImg && viewerLink) {
                    const full =
                        first.startsWith('http')
                            ? first
                            : `${window.location.origin}/${first.replace(/^\/+/, '')}`;
                    viewerImg.src = full;
                    viewerLink.href = full;
                    showImageViewer(full);
                }
            } catch (err) {
                console.error('Rigenerazione fallita', err);
                alert('Rigenerazione fallita. Riprova tra poco.');
            } finally {
                hideGenLoader();
            }
        });

        // Generation loader controls
        const genLoader = document.getElementById('genLoader');
        const genLoaderAnim = document.getElementById('genLoaderAnim');
        let genLoaderMounted = false;

        const showGenLoader = () => {
            if (!genLoader) return;
            genLoader.classList.add('active');
            if (!genLoaderMounted && window.lottie && genLoaderAnim) {
                window.lottie.loadAnimation({
                    container: genLoaderAnim,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: '/animations/Loading Dots In Yellow.json',
                });
                genLoaderMounted = true;
            } else if (!window.lottie) {
                // Se lottie non è pronto, riprova tra 200ms
                setTimeout(showGenLoader, 200);
            }
        };

        const hideGenLoader = () => {
            genLoader?.classList.remove('active');
        };

        // Publish modal
        const publishModal = document.getElementById('publishModal');
        const publishBackdrop = document.getElementById('publishBackdrop');
        const publishClose = document.getElementById('publishClose');
        const publishImageSelect = document.getElementById('publishImageSelect');
        const publishImagePreview = document.getElementById('publishImagePreview');
        const publishGuideline = document.getElementById('publishGuideline');
        const publishTone = document.getElementById('publishTone');
        const publishGenerate = document.getElementById('publishGenerate');
        const publishCopyDesc = document.getElementById('publishCopyDesc');
        const publishRename = document.getElementById('publishRename');
        const publishTitle = document.getElementById('publishTitle');
        const publishDescription = document.getElementById('publishDescription');

        const openPublish = async () => {
            if (!publishModal) return;
            publishModal.classList.add('active');
            await loadPublishImages();
        };

        const closePublish = () => {
            publishModal?.classList.remove('active');
        };

        publishClose?.addEventListener('click', closePublish);
        publishBackdrop?.addEventListener('click', closePublish);

        async function loadPublishImages() {
            if (!publishImageSelect) return;
            try {
                const resp = await fetch('/api/gallery');
                const data = await resp.json();
                const files = data?.files || [];
                publishImageSelect.innerHTML = '';
                files.forEach((f, idx) => {
                    const opt = document.createElement('option');
                    opt.value = f.name;
                    opt.textContent = f.name;
                    if (idx === 0) opt.selected = true;
                    publishImageSelect.appendChild(opt);
                });
                if (files.length) {
                    updatePublishPreview(files[0].name);
                } else {
                    publishImagePreview.src = '';
                }
            } catch (err) {
                console.error('Load publish images failed', err);
            }
        }

        function updatePublishPreview(name) {
            if (!name || !publishImagePreview) return;
            publishImagePreview.src = `/generated/${name}`;
        }

        publishImageSelect?.addEventListener('change', (e) => {
            updatePublishPreview(e.target.value);
        });

        publishCopyDesc?.addEventListener('click', () => {
            if (publishDescription?.value) {
                navigator.clipboard?.writeText(publishDescription.value).catch(() => {});
            }
        });

        publishRename?.addEventListener('click', async () => {
            const filename = publishImageSelect?.value;
            const newTitle = publishTitle?.value;
            if (!filename || !newTitle) return;
            try {
                const resp = await fetch('/api/publish/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, newTitle }),
                });
                const data = await resp.json();
                if (resp.ok && data?.filename) {
                    updatePublishPreview(data.filename);
                    if (publishImageSelect) {
                        const opt = Array.from(publishImageSelect.options).find((o) => o.value === filename);
                        if (opt) opt.value = opt.textContent = data.filename;
                        publishImageSelect.value = data.filename;
                    }
                }
            } catch (err) {
                console.error('Rename failed', err);
            }
        });

        publishGenerate?.addEventListener('click', async () => {
            const filename = publishImageSelect?.value;
            const guideline = publishGuideline?.value;
            const tone = publishTone?.value;
            if (!filename) return;
            showGenLoader();
            try {
                const resp = await fetch('/api/publish/describe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename, guideline, tone }),
                });
                const contentType = resp.headers.get('content-type') || '';
                let data;
                try {
                    data = contentType.includes('application/json')
                        ? await resp.json()
                        : { error: await resp.text() };
                } catch (parseErr) {
                    data = { error: 'Unable to parse response' };
                }

                if (!resp.ok) {
                    if (resp.status === 429) {
                        alert('Limite di richieste raggiunto. Attendi qualche secondo e riprova.');
                        console.warn('[publish/describe] Limite di richieste raggiunto (429). Riprova tra qualche secondo.');
                        return;
                    }
                    throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
                }

                const result = data?.result || {};
                const title = result.title || '';
                const desc = result.description || data?.raw || '';
                if (publishTitle) publishTitle.value = title;
                if (publishDescription) publishDescription.value = desc;
            } catch (err) {
                console.error('Describe failed', err);
            } finally {
                hideGenLoader();
            }
        });

        // Initialize on load
        initHeroSlideshow();
        initInstantPreviewSection();
        initGallery();
        initProblemSolutionReveal();
        initFaqAccordion();
        initUploadModal();

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');

        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Header scroll effect
        const header = document.getElementById('header');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });

        // Smooth scrolling and active navigation
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href') || '';
                // Allow normal navigation for full/relative pages (es. gallery.html)
                if (!href.startsWith('#')) {
                    return;
                }
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    const headerHeight = header.offsetHeight;
                    const targetPosition = targetSection.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Close mobile menu if open
                    navMenu.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });
        });

        // Update active navigation on scroll
        function updateActiveNav() {
            const scrollPosition = window.scrollY + 100;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        const href = link.getAttribute('href').substring(1);
                        if (href === sectionId) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }

        window.addEventListener('scroll', updateActiveNav);

        // Animated counter for stats
        function animateCounter(element) {
            const target = parseInt(element.dataset.target);
            const suffix = element.dataset.suffix || '';
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            
            const counter = setInterval(() => {
                current += step;
                if (current >= target) {
                    element.textContent = `${target}${suffix}`;
                    clearInterval(counter);
                } else {
                    element.textContent = `${Math.floor(current)}${suffix}`;
                }
            }, 16);
        }

        // Intersection Observer for stats animation
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumbers = entry.target.querySelectorAll('.stat-number');
                    statNumbers.forEach(number => {
                        if (!number.classList.contains('animated')) {
                            number.classList.add('animated');
                            animateCounter(number);
                        }
                    });
                }
            });
        }, observerOptions);

        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            observer.observe(statsSection);
        }

        // Loading screen (fail-safe hides on DOM ready and on load)
        const hideLoader = () => {
            const loader = document.getElementById('loader');
            if (loader && !loader.classList.contains('hidden')) {
                loader.classList.add('hidden');
            }
        };
        hideLoader();
        setTimeout(hideLoader, 3000);
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(hideLoader, 500);
        });
        window.addEventListener('load', () => {
            setTimeout(hideLoader, 1500);
        });

        // Add parallax effect to hero section
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = document.querySelector('.hero');
            if (parallax) {
                parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
