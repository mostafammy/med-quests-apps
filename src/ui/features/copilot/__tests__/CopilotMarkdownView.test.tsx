import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CopilotMarkdownView, formatInline } from '../CopilotMarkdownView.tsx';

describe('CopilotMarkdownView & formatInline', () => {
  it('converts <br> variants into React <br> elements instead of displaying raw text', () => {
    const raw = 'First line<br>Second line<br/>Third line<br />Fourth line</br>Fifth line<BR>Sixth line';
    const html = renderToString(<div>{formatInline(raw)}</div>);

    expect(html).not.toContain('&lt;br&gt;');
    expect(html).not.toContain('&lt;br/&gt;');
    expect(html).not.toContain('&lt;br /&gt;');
    expect(html).not.toContain('&lt;/br&gt;');
    expect(html).not.toContain('&lt;BR&gt;');
    expect(html).toContain('<br/>');
    expect(html).toContain('First line');
    expect(html).toContain('Second line');
  });

  it('converts HTML-entity encoded &lt;br&gt; into <br> elements', () => {
    const raw = 'Line 1&lt;br&gt;Line 2&lt;br/&gt;Line 3';
    const html = renderToString(<div>{formatInline(raw)}</div>);

    expect(html).not.toContain('&lt;br&gt;');
    expect(html).not.toContain('&lt;br/&gt;');
    expect(html).toContain('<br/>');
    expect(html).toContain('Line 1');
    expect(html).toContain('Line 2');
    expect(html).toContain('Line 3');
  });

  it('correctly formats the user reported Neuroglia table containing <br> in cells', () => {
    const markdownContent = `**Neuroglia (glial cells) – the supporting staff of the CNS**

| Cell type | Primary location | Key functions (high‑yield) |
|-----------|------------------|----------------------------|
| **Astrocytes** | Throughout gray and white matter | • Maintain extracellular ion (K⁺) and neurotransmitter (glutamate) balance<br>• Form the blood‑brain barrier (end‑feet on capillaries)<br>• Provide metabolic support (lactate shuttle to neurons)<br>• Scaffold for synapse formation |
| **Oligodendrocytes** | White matter (myelinate CNS axons) | • Produce CNS myelin (multiple axons per cell)<br>• Facilitate rapid salt‑bridge conduction<br>• Contribute to axonal metabolic support |
| **Microglia** | Distributed in parenchyma | • Resident immune cells (phagocytose debris, pathogens, apoptotic neurons)<br>• Release cytokines, present antigens<br>• Prune synapses during development |
| **Ependymal cells** | Lining ventricles & central canal | • Produce and circulate cerebrospinal fluid (CSF) via cilia<br>• Form a barrier between CSF and brain parenchyma (loose, not tight) |
| **NG2 (polydendrocyte) cells** | Throughout CNS | • Serve as oligodendrocyte precursors; can differentiate into myelinating cells after injury |

**Core concepts to remember for the USMLE**

1. **Support, not conduct:** Glia do not generate action potentials (except some astrocytic Ca²⁺ waves) but they are essential for neuronal health and signal fidelity.
2. **Myelination distinction:** *Oligodendrocytes* = CNS myelin; *Schwann cells* = PNS myelin.
3. **Blood‑brain barrier:** Astrocytic end‑feet + tight junctions of endothelial cells = BBB.
4. **Immune privilege:** Microglia are the only true immune cells inside the CNS; they become activated in infection, trauma, or neurodegeneration.
5. **CSF production:** Ependymal ciliated cells line the ventricles; they are not true “epithelium” but a simple cuboidal epithelium.

**Mnemonic for the four classic CNS glia**  
**A‑O‑M‑E** → **A**strocyte, **O**ligodendrocyte, **M**icroglia, **E**pendymal. Remember “**A**lways **O**bserve **M**icroscopic **E**lements” when a question asks “What cell type supports …?”`;

    const html = renderToString(<CopilotMarkdownView content={markdownContent} />);

    // Verify no literal <br> tag appears escaped as text (&lt;br&gt;) anywhere in rendered HTML
    expect(html).not.toContain('&lt;br&gt;');
    expect(html).not.toContain('&lt;br/&gt;');
    expect(html).not.toContain('&lt;br /&gt;');

    // Verify table structure
    expect(html).toContain('<table');
    expect(html).toContain('Astrocytes');
    expect(html).toContain('Oligodendrocytes');
    expect(html).toContain('Microglia');
    expect(html).toContain('Ependymal cells');

    // Verify cell contains <br/> tags separating bullet points
    expect(html).toContain('<br/>• Form the blood‑brain barrier');

    // Verify lists and bold are rendered
    expect(html).toContain('<strong');
    expect(html).toContain('Support, not conduct:');
  });

  it('handles standalone <br> lines without rendering broken paragraphs', () => {
    const content = 'Paragraph 1\n<br>\nParagraph 2\n<br/>\nParagraph 3';
    const html = renderToString(<CopilotMarkdownView content={content} />);

    expect(html).not.toContain('&lt;br&gt;');
    expect(html).toContain('Paragraph 1');
    expect(html).toContain('Paragraph 2');
    expect(html).toContain('Paragraph 3');
  });
});
