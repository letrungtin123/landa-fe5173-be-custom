// ============================================================
// problemParser.ts — Phân tích HTML của Open edX Problem Block
// Dùng DOMParser bóc tách các loại câu hỏi (radio, checkbox, select, text...)
// ============================================================

export type ProblemType =
  | "single-select"
  | "multi-select"
  | "dropdown"
  | "text-input";

export interface ProblemOption {
  id: string; // The "value" of the input
  text: string; // The label or text
}

export interface ParsedProblem {
  id: string; // Tương đương với name="..." của input, dùng để submit
  type: ProblemType;
  questionHtml: string;
  options?: ProblemOption[]; // Chỉ dành cho select/radio/checkbox
  explanationHtml?: string; // Giải thích khi nộp bài
  hintHtml?: string; // Gợi ý
  correctAnswerHtml?: string; // Đáp án đúng
  hasHints: boolean; // true nếu quiz có cấu hình demand hint trong Studio
}

/**
 * Trích xuất các câu hỏi từ mã HTML/OLX Problem.
 * Hỗ trợ cả:
 * 1. OLX XML (custom BE lưu trực tiếp): <problem><multiplechoiceresponse>...
 * 2. Rendered HTML (edX student_view): <div class="problem">...
 */
export function parseProblemHtml(html: string): ParsedProblem[] {
  if (!html) return [];

  // Detect OLX XML format: starts with <problem> tag
  const trimmed = html.trim();
  if (trimmed.startsWith('<problem>') || trimmed.startsWith('<problem ')) {
    return parseOlxProblem(trimmed);
  }

  // Fallback: parse as rendered edX HTML (legacy support)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const problems: ParsedProblem[] = [];

  // ── Bước đặc biệt: Giải mã data-content ──
  // xblock_view API trả HTML có cấu trúc:
  //   <div class="problems-wrapper" data-content="...HTML-encoded quiz content...">
  //     <p class="loading-spinner">...</p>
  //   </div>
  // Nội dung quiz thực sự (radio, checkbox, v.v.) nằm BÊN TRONG data-content
  // dưới dạng HTML entities. Ta cần decode rồi re-parse.
  const problemsWrapper = doc.querySelector(".problems-wrapper[data-content]");
  let searchDoc: Document | DocumentFragment = doc;

  if (problemsWrapper) {
    const encodedContent = problemsWrapper.getAttribute("data-content") || "";
    if (encodedContent) {
      // Decode HTML entities (DOMParser tự decode khi parse)
      const contentDoc = parser.parseFromString(encodedContent, "text/html");
      searchDoc = contentDoc;

    }
  }

  // Tìm tất cả các container chứa response (inputs)
  const responseWrappers = searchDoc.querySelectorAll(".wrapper-problem-response");

  responseWrappers.forEach((wrapper) => {


    // 1. Phân loại input type
    let type: ProblemType = "text-input";
    let inputName = "";
    const options: ProblemOption[] = [];

    // Check Single Select (radio)
    const radios = wrapper.querySelectorAll("input[type='radio']");
    if (radios.length > 0) {
      type = "single-select";
      inputName = radios[0].getAttribute("name") || "";
      radios.forEach((radio) => {
        const val = radio.getAttribute("value") || "";
        const radioId = radio.getAttribute("id") || "";
        // Open edX: label là sibling trong .field div, linked bằng for="{radioId}"
        const labelEl = radioId
          ? wrapper.querySelector(`label[for='${radioId}']`)
          : radio.closest(".field")?.querySelector("label");
        const text = labelEl?.textContent?.trim() || val;
        options.push({ id: val, text });
      });
    }

    // Check Multi Select (checkbox)
    const checkboxes = wrapper.querySelectorAll("input[type='checkbox']");
    if (checkboxes.length > 0) {
      type = "multi-select";
      inputName = checkboxes[0].getAttribute("name") || "";
      checkboxes.forEach((cb) => {
        const val = cb.getAttribute("value") || "";
        const cbId = cb.getAttribute("id") || "";
        const labelEl = cbId
          ? wrapper.querySelector(`label[for='${cbId}']`)
          : cb.closest(".field")?.querySelector("label");
        const text = labelEl?.textContent?.trim() || val;
        options.push({ id: val, text });
      });
    }

    // Check Dropdown (select)
    const selects = wrapper.querySelectorAll("select");
    if (selects.length > 0) {
      type = "dropdown";
      inputName = selects[0].getAttribute("name") || "";
      const opts = selects[0].querySelectorAll("option");
      opts.forEach((opt) => {
        const val = opt.getAttribute("value") || "";
        if (val) {
          options.push({ id: val, text: opt.textContent?.trim() || val });
        }
      });
    }

    // Check Text/Numerical Input (text)
    const texts = wrapper.querySelectorAll("input[type='text']");
    if (texts.length > 0) {
      type = "text-input";
      inputName = texts[0].getAttribute("name") || "";
    }

    if (!inputName) return; // Không đọc được input name thì bỏ qua



    // 2. Tìm đề bài (question text)
    // Open edX Capa HTML đặt question text ở các vị trí khác nhau:
    // a) Bên trong wrapper: <div class="wrapper-problem-response"><div>Question?</div><div class="choicegroup">...</div></div>
    // b) Bên trên wrapper: <p>Question?</p><div class="wrapper-problem-response">...</div>
    // c) Trong h3.problem-header
    // d) Dropdown: <div>Question?</div><div class="option-input"><select>...</select></div>
    let questionHtml = "";

    // Strategy A: Tìm text bên trong wrapper, trước input container
    // Cho dropdown: input container là .option-input hoặc .inputtype
    const inputContainer = wrapper.querySelector(
      ".choicegroup, .capa_inputtype, .option-input, .optioninput, .inputtype"
    ) || wrapper.querySelector("select, input[type='text']");
    
    if (inputContainer) {
      // Tìm container cha phù hợp
      let closestContainer = inputContainer.closest(
        ".choicegroup, .capa_inputtype, .option-input, .optioninput, .inputtype"
      ) as Element || inputContainer;
      
      // Tìm element là child TRỰC TIẾP của wrapper chứa closestContainer
      let topLevelContainer = closestContainer;
      while (topLevelContainer.parentElement && topLevelContainer.parentElement !== wrapper) {
        topLevelContainer = topLevelContainer.parentElement;
      }

      const children = Array.from(wrapper.children);
      const inputIdx = children.indexOf(topLevelContainer);
      
      if (inputIdx > 0) {
        // Lấy tất cả elements trước input container làm questionHtml
        const questionChildren = children.slice(0, inputIdx);
        questionHtml = questionChildren.map(el => el.outerHTML).join("");
      } else if (inputIdx === 0) {
        // Nếu input container là child đầu tiên, tìm các childNodes (TextNodes) trước nó
        // Trường hợp này xảy ra khi question text nằm trần truồng không được bọc bằng <p> hay <div>
        const allNodes = Array.from(wrapper.childNodes);
        const containerIdx = allNodes.indexOf(topLevelContainer as ChildNode);
        if (containerIdx > 0) {
          const questionNodes = allNodes.slice(0, containerIdx);
          questionHtml = questionNodes
            .filter(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()))
            .map(n => n.nodeType === Node.ELEMENT_NODE ? (n as Element).outerHTML : n.textContent?.trim() || "")
            .join("");
        }
      }
      
      // Fallback Strategy A.2: Nếu questionHtml vẫn trống và wrapper có nội dung khác ngoài topLevelContainer
      if (!questionHtml.trim() && wrapper.children.length === 1 && topLevelContainer.children.length > 0) {
        // Open edX dạng mới: 
        // <div class="wrapper-problem-response">
        //   <div class="textline">
        //      <p>Question string</p>
        //      <input type="text" />
        //   </div>
        // </div>
        // Lúc này question nằm chung trong topLevelContainer. Tìm tất cả nội dung phía TRƯỚC input bên trong nó
        const allInnerNodes = Array.from(topLevelContainer.childNodes);
        const innerInputIdx = allInnerNodes.findIndex(n => n.contains && (n as Element).contains(inputContainer));
        if (innerInputIdx > 0) {
          const questionInnerNodes = allInnerNodes.slice(0, innerInputIdx);
          questionHtml = questionInnerNodes
            .filter(n => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()))
            .map(n => n.nodeType === Node.ELEMENT_NODE ? (n as Element).outerHTML : n.textContent?.trim() || "")
            .join("");
        }
      }
    }

    // Strategy B: Nếu A trống, tìm previous siblings của wrapper (kế hoạch tốt nhất cho numerical/text input nơi câu hỏi nằm ngoài)
    if (!questionHtml.trim()) {
      let prevNode = wrapper.previousElementSibling;
      const explicitLabel = searchDoc.querySelector(`label[for='${selects.length > 0 ? selects[0].id : inputName}']:not(.problem-group-label)`);
      if (explicitLabel) {
        questionHtml = explicitLabel.innerHTML;
      } else {
        const questionParts: string[] = [];
        while (
          prevNode &&
          !prevNode.classList.contains("wrapper-problem-response") &&
          prevNode.tagName !== "H1" && prevNode.tagName !== "H2" && prevNode.tagName !== "H3"
        ) {
          questionParts.unshift(prevNode.outerHTML);
          prevNode = prevNode.previousElementSibling;
        }
        questionHtml = questionParts.join("");
      }
    }

    // Strategy C: Nếu B trống, tìm h3.problem-header (đây thường là tên component, không phải câu hỏi)
    if (!questionHtml.trim()) {
      const problemHeader = searchDoc.querySelector("h3.problem-header, .hd.problem-header");
      if (problemHeader) {
        questionHtml = problemHeader.innerHTML;
      }
    }

    // Fallback
    if (!questionHtml.trim()) {
      questionHtml = "Câu trả lời của bạn là:";
    }

    // ── 3. Tìm Explanation (Giải thích đáp án) ──
    // QUAN TRỌNG: Trong HTML ban đầu (student_view), Open edX KHÔNG gửi nội dung
    // explanation. Element .solution-span tồn tại nhưng RỖNG (display:none).
    // Nội dung chỉ xuất hiện trong response `contents` sau khi user submit quiz.
    let explanationHtml = "";
    
    // Strategy A: .detailed-solution (từ <solution> OLX tag — có trong response sau submit)
    const solutionDiv = wrapper.querySelector(".detailed-solution") || searchDoc.querySelector(".detailed-solution");
    if (solutionDiv && solutionDiv.textContent?.trim()) {
      explanationHtml = solutionDiv.innerHTML;
    }
    
    // Strategy B: .solution-span — chỉ lấy nếu có nội dung thực sự
    if (!explanationHtml) {
      const solutionSpan = wrapper.querySelector(".solution-span") || searchDoc.querySelector(".solution-span");
      if (solutionSpan) {
        const spanContent = solutionSpan.querySelector("span");
        if (spanContent && spanContent.textContent?.trim()) {
          explanationHtml = spanContent.innerHTML;
        }
      }
    }

    // Strategy C: Per-choice feedback (.feedback-hint-text — xuất hiện sau submit)
    if (!explanationHtml) {
      const feedbackHint = wrapper.querySelector(".feedback-hint-text") || searchDoc.querySelector(".feedback-hint-text");
      if (feedbackHint && feedbackHint.textContent?.trim()) {
        explanationHtml = feedbackHint.innerHTML;
      }
    }

    // Strategy D: .explanation block
    if (!explanationHtml) {
      const explanationDiv = wrapper.querySelector(".explanation") || searchDoc.querySelector(".explanation");
      if (explanationDiv && explanationDiv.textContent?.trim()) {
        explanationHtml = explanationDiv.innerHTML;
      }
    }

    // Làm sạch và Việt hóa chữ "Explanation" mặc định của Open edX
    if (explanationHtml) {
      // Open edX thường bọc chữ Explanation trong thẻ b hoặc p hoặc h3
      explanationHtml = explanationHtml.replace(/>\s*Explanation\s*</gi, ">Giải thích: <");
      // Hoặc nếu nó là chữ trơn đứng đầu
      explanationHtml = explanationHtml.replace(/(^|>|<br\s*\/?>|\s)Explanation(?![\w])/g, "$1Giải thích:");
    }

    // ── 3.5 Tìm Đáp Án Đúng (Correct Answer) ──
    let correctAnswerHtml = "";
    
    // Strategy A: .answer cho Text input / Numerical input
    const answerSpan = wrapper.querySelector(".answer") || searchDoc.querySelector(".answer");
    if (answerSpan && answerSpan.textContent?.trim()) {
      let clone = answerSpan.cloneNode(true) as HTMLElement;
      // remove correct checkmark icon if any
      const correctMarker = clone.querySelector(".status, .correct");
      if (correctMarker) correctMarker.remove();
      const txt = clone.textContent?.replace("Đáp án đúng:", "")?.trim();
      if (txt) correctAnswerHtml = txt;
    }

    // Strategy B: .choicegroup_correct cho radio/checkbox
    if (!correctAnswerHtml && (type === "single-select" || type === "multi-select")) {
      const correctLabels = wrapper.querySelectorAll("label.choicegroup_correct, .indicator-container.correct");
      if (correctLabels.length > 0) {
        const correctTexts = Array.from(correctLabels).map(l => {
          let clone = l.cloneNode(true) as HTMLElement;
          if (clone.classList.contains("indicator-container")) {
             // Sometimes in older edX versions the correct is wrapped differently
             const parentLabel = clone.closest("label");
             if (parentLabel) clone = parentLabel.cloneNode(true) as HTMLElement;
          }
          const status = clone.querySelector(".status, .indicator-container");
          if (status) status.remove();
          const attrInput = clone.querySelector("input");
          if (attrInput) attrInput.remove();
          return clone.textContent?.trim() || "";
        }).filter(Boolean);
        if (correctTexts.length > 0) {
          correctAnswerHtml = correctTexts.join(" ; ");
        }
      }
    }

    // Fallback C: Nửa vời cho Dropdown
    if (!correctAnswerHtml && type === "dropdown") {
      // 1. Nếu có thẻ .answer rõ ràng (vd: khi người dùng xem được đáp án cuối cùng)
      const answerSpan = wrapper.querySelector(".answer");
      if (answerSpan && answerSpan.textContent?.trim()) {
        correctAnswerHtml = answerSpan.textContent.replace("Đáp án đúng:", "").trim();
      } else {
        // 2. Chỉ tính thẻ option đang [selected] LÀ ĐÚNG NẾU như trạng thái của quiz đang là correct
        const isWrapperCorrect = wrapper.querySelector(".status.correct, .indicator-container.correct, .indicator-container .correct");
        if (isWrapperCorrect) {
          const correctOpt = wrapper.querySelector("select option[selected]");
          if (correctOpt) {
            correctAnswerHtml = correctOpt.textContent?.trim() || "";
          }
        }
      }
    }

    // ── 4. Tìm Hint (Gợi ý) ──
    // Open edX hint data KHÔNG có sẵn trong student_view HTML.
    // .problem-hint chứa buttons (Next Hint, Review) nhưng KHÔNG chứa hint text.
    // .demandhint cũng chỉ chứa buttons.
    // Hint text chỉ xuất hiện KHI:
    //   1. User click "Hint" → edX JS gọi hint_button handler → inject .hint-text vào DOM
    //   2. Response sau submit (contents field) có thể chứa hint
    //
    // => Parser CHỈ lấy hint từ .hint-text (nội dung thực sự đã rendered)
    // => KHÔNG bao giờ lấy từ .problem-hint hay .demandhint (chỉ có button text)
    let hintHtml = "";
    
    // Strategy A: .hint-text elements — NỘI DUNG HINT THỰC SỰ
    // Chỉ xuất hiện sau khi edX JS đã render hint (qua hint_button handler)
    const hintTextEls = searchDoc.querySelectorAll(".hint-text");
    if (hintTextEls.length > 0) {
      const texts = Array.from(hintTextEls)
        .map(h => h.textContent?.trim())
        .filter(Boolean);
      if (texts.length > 0) {
        hintHtml = Array.from(hintTextEls)
          .map(h => h.innerHTML.trim())
          .filter(Boolean)
          .join("<br/>");
      }
    }
    // Strategy A là nguồn duy nhất đáng tin cậy cho hint content.
    // .problem-hint và .demandhint LUÔN chứa button text (Next Hint, Review),
    // KHÔNG BAO GIỜ chứa nội dung hint thực sự trong student_view HTML ban đầu.
    // Hint thực sự chỉ có qua:
    //   1. .hint-text elements (sau khi edX JS render)
    //   2. Nút "Xem gợi ý" custom (gọi hint_button API)

    // ── 5. Detect hint availability ──
    // edX problem.html template renders <button class="hint-button"> ONLY when
    // demand_hint_possible is true (i.e. quiz has <demandhint><hint> configured in Studio).
    // We also check for .problem-hint container and .demandhint as fallback markers.
    const hasHints = !!(
      searchDoc.querySelector("button.hint-button") ||
      searchDoc.querySelector(".problem-hint") ||
      searchDoc.querySelector(".demandhint")
    );

    problems.push({
      id: inputName,
      type,
      questionHtml,
      options: options.length > 0 ? options : undefined,
      explanationHtml: explanationHtml.trim() || undefined,
      hintHtml: hintHtml.trim() || undefined,
      correctAnswerHtml: correctAnswerHtml.trim() || undefined,
      hasHints,
    });
  });

  return problems;
}

/**
 * Parse OLX XML format (custom BE lưu trực tiếp).
 * Hỗ trợ 5 loại problem edX:
 * 1. multiplechoiceresponse → single-select (radio)
 * 2. choiceresponse → multi-select (checkbox)
 * 3. optionresponse → dropdown
 * 4. stringresponse → text-input
 * 5. numericalresponse → text-input
 */
function parseOlxProblem(xml: string): ParsedProblem[] {
  const parser = new DOMParser();
  // Parse as HTML (more lenient than XML parser)
  const doc = parser.parseFromString(xml, "text/html");
  const problemEl = doc.querySelector("problem") || doc.body;
  const problems: ParsedProblem[] = [];

  // Extract question text: everything before the first response element
  const responseSelectors = [
    "multiplechoiceresponse", "choiceresponse", "optionresponse",
    "stringresponse", "numericalresponse",
  ];

  // Collect all response elements
  const responseEls = problemEl.querySelectorAll(responseSelectors.join(","));
  if (responseEls.length === 0) return [];

  // Question text = all content before first response element
  let questionHtml = "";
  const allChildren = Array.from(problemEl.childNodes);
  for (const child of allChildren) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (responseSelectors.includes(tag) || tag === "solution" || tag === "demandhint") break;
      questionHtml += el.outerHTML;
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      questionHtml += child.textContent.trim();
    }
  }

  // Extract solution/explanation
  let explanationHtml = "";
  const solutionEl = problemEl.querySelector("solution");
  if (solutionEl) {
    const detailedSolution = solutionEl.querySelector(".detailed-solution");
    explanationHtml = detailedSolution ? detailedSolution.innerHTML : solutionEl.innerHTML;
  }

  // Extract hints
  let hintHtml = "";
  const hints = problemEl.querySelectorAll("demandhint hint");
  const hasHints = hints.length > 0;
  if (hasHints) {
    hintHtml = Array.from(hints)
      .map(h => h.textContent?.trim())
      .filter(Boolean)
      .join("<br/>");
  }

  let problemIndex = 0;

  // 1. multiplechoiceresponse → single-select
  problemEl.querySelectorAll("multiplechoiceresponse").forEach((resp) => {
    const options: ProblemOption[] = [];
    let correctAnswerHtml = "";
    resp.querySelectorAll("choice").forEach((choice, i) => {
      const text = choice.textContent?.trim() || "";
      const id = `choice_${i}`;
      options.push({ id, text });
      if (choice.getAttribute("correct") === "true") {
        correctAnswerHtml = text;
      }
    });
    problems.push({
      id: `olx_mcq_${problemIndex++}`,
      type: "single-select",
      questionHtml: questionHtml || "Chọn đáp án đúng:",
      options,
      explanationHtml: explanationHtml || undefined,
      hintHtml: hintHtml || undefined,
      correctAnswerHtml: correctAnswerHtml || undefined,
      hasHints,
    });
  });

  // 2. choiceresponse → multi-select
  problemEl.querySelectorAll("choiceresponse").forEach((resp) => {
    const options: ProblemOption[] = [];
    let correctParts: string[] = [];
    resp.querySelectorAll("choice").forEach((choice, i) => {
      const text = choice.textContent?.trim() || "";
      const id = `choice_${i}`;
      options.push({ id, text });
      if (choice.getAttribute("correct") === "true") {
        correctParts.push(text);
      }
    });
    problems.push({
      id: `olx_multi_${problemIndex++}`,
      type: "multi-select",
      questionHtml: questionHtml || "Chọn tất cả đáp án đúng:",
      options,
      explanationHtml: explanationHtml || undefined,
      hintHtml: hintHtml || undefined,
      correctAnswerHtml: correctParts.join(" ; ") || undefined,
      hasHints,
    });
  });

  // 3. optionresponse → dropdown
  problemEl.querySelectorAll("optionresponse").forEach((resp) => {
    const options: ProblemOption[] = [];
    const optionInput = resp.querySelector("optioninput");
    if (optionInput) {
      // Options can be in 'options' attribute: "('opt1','opt2')" or <option> children
      const optionsAttr = optionInput.getAttribute("options");
      if (optionsAttr) {
        const matches = optionsAttr.match(/'([^']+)'/g);
        if (matches) {
          matches.forEach((m, i) => {
            const text = m.replace(/'/g, "");
            options.push({ id: text, text });
          });
        }
      }
      optionInput.querySelectorAll("option").forEach((opt) => {
        const text = opt.textContent?.trim() || "";
        if (text) options.push({ id: text, text });
      });
    }
    const correct = optionInput?.getAttribute("correct") || "";
    problems.push({
      id: `olx_dropdown_${problemIndex++}`,
      type: "dropdown",
      questionHtml: questionHtml || "Chọn đáp án từ danh sách:",
      options,
      explanationHtml: explanationHtml || undefined,
      hintHtml: hintHtml || undefined,
      correctAnswerHtml: correct || undefined,
      hasHints,
    });
  });

  // 4. stringresponse → text-input
  problemEl.querySelectorAll("stringresponse").forEach((resp) => {
    const correct = resp.getAttribute("answer") || "";
    problems.push({
      id: `olx_text_${problemIndex++}`,
      type: "text-input",
      questionHtml: questionHtml || "Nhập câu trả lời:",
      explanationHtml: explanationHtml || undefined,
      hintHtml: hintHtml || undefined,
      correctAnswerHtml: correct || undefined,
      hasHints,
    });
  });

  // 5. numericalresponse → text-input
  problemEl.querySelectorAll("numericalresponse").forEach((resp) => {
    const correct = resp.getAttribute("answer") || "";
    problems.push({
      id: `olx_num_${problemIndex++}`,
      type: "text-input",
      questionHtml: questionHtml || "Nhập đáp án số:",
      explanationHtml: explanationHtml || undefined,
      hintHtml: hintHtml || undefined,
      correctAnswerHtml: correct || undefined,
      hasHints,
    });
  });

  return problems;
}
