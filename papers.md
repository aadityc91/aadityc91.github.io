<h1 class="title">Papers</h1>

<div style="margin-bottom: 1.25rem;">
  <div style="display:flex; justify-content:space-between; align-items:baseline;">
    <h3 style="margin:0; font-size:1.1rem;"><a href="https://ieeexplore.ieee.org/document/11738423" target="_blank" class="cactus-link">The Fusion Tax: A Diagnostic Analysis of When Hybrid Retrieval Hurts</a></h3>
    <span style="color:var(--color-text-offset); font-size:0.9rem; white-space:nowrap; margin-left:1rem;">2026</span>
  </div>
  <p class="paper-meta" style="margin-top:0.5rem; color:var(--color-global-text); opacity:0.75;">
    Aaditya Chauhan, Arun Agarwal<br>
    IEEE Access (Early Access), Oct 2026 · <a href="https://doi.org/10.1109/ACCESS.2026.3743502" target="_blank" class="cactus-link">doi:10.1109/ACCESS.2026.3743502</a>
  </p>
  <details class="abstract-block">
    <summary>Abstract</summary>
    <p>Hybrid retrieval, which fuses a sparse lexical retriever with a dense neural one, is the default recommendation of most search stacks and retrieval-augmented generation frameworks, usually with reciprocal rank fusion (RRF), on the strength of aggregate gains. We ask what fusion costs on individual queries, treating “do not fuse” as a first-class outcome, in the setting in which hybrid retrieval is deployed: a standard Anserini BM25, five dense encoders spanning 22M–596M parameters and three model generations, a learned-sparse (SPLADE) alternative, and a cross-encoder second stage, on seven BEIR datasets and three fusion functions. Even the best method, dense-weighted score interpolation, ranks relevant documents below the better of its two components on 13–48% of queries and below the deployable dense-only retriever on 8–21% (14–48% and 11–25% at a weight selected under leave-one-corpus-out validation), while beating dense-only in aggregate on every corpus with the primary encoder; the downside is significant under loss-averse risk-sensitive evaluation on six of the seven corpora. We call this loss the fusion tax. It is mostly a ranking effect that preserves recall in aggregate, it is most likely on the queries that only one retriever covers, and it persists across the encoder ladder and the SPLADE substitution. RRF carries the higher tax wherever the dense retriever is clearly stronger and only beats dense-only where the two components are balanced. Fusion failure is weakly predictable within a corpus but transfers unreliably across corpora, because the features that predict it change sign with the sparse–dense balance. A cross-encoder recovers part of the tax only where it is itself reliable. We distill these findings into guidance that keys the fusion decision to the measured sparse–dense balance of the target corpus.</p>
  </details>
  <details class="cite-block">
    <summary>BibTeX</summary>
    <pre><code>@article{chauhan2026fusiontax,
  author  = {Chauhan, Aaditya and Agarwal, Arun},
  title   = {The Fusion Tax: A Diagnostic Analysis of When Hybrid
             Retrieval Hurts},
  journal = {IEEE Access},
  year    = {2026},
  doi     = {10.1109/ACCESS.2026.3743502},
  issn    = {2169-3536},
  note    = {Early Access}
}</code></pre>
  </details>
</div>

<div style="margin-bottom: 1.25rem;">
  <div style="display:flex; justify-content:space-between; align-items:baseline;">
    <h3 style="margin:0; font-size:1.1rem;"><a href="https://arxiv.org/abs/2609.18154" target="_blank" class="cactus-link">PageRecall: Measuring Page Selection in Literature-Grounded Question Answering</a></h3>
    <span style="color:var(--color-text-offset); font-size:0.9rem; white-space:nowrap; margin-left:1rem;">2026</span>
  </div>
  <p class="paper-meta" style="margin-top:0.5rem; color:var(--color-global-text); opacity:0.75;">
    Aaditya Chauhan<br>
    arXiv preprint <a href="https://arxiv.org/abs/2609.18154" target="_blank" class="cactus-link">arXiv:2609.18154</a> · cs.IR, cs.CL
  </p>
  <details class="abstract-block">
    <summary>Abstract</summary>
    <p>We describe our system for LitTraceQA (GroundLM @ EMNLP 2026): given a research question, retrieve the relevant papers from a pool of 27,487, cite the page and the table or figure where the answer lives, and answer in a requested format. Our main finding is that evidence grounding is limited by retrieval, not by reading. The page selector put the annotator's page, which we call the gold page, in front of the model that locates evidence only about half the time (52.6% gold-page recall), while that model, given the page, cited the right one in 45 of the 48 locators it emitted (94%). When the page was missing it rarely said so: of 45 such cases it returned nothing 14 times, a wrong page 24 times, and a correct page 7 times, so the pipeline failed quietly almost twice as often as it failed visibly. Since the failure was that the right page was never shown, the fix is to stop choosing: each retrieved paper fits in the model's context, so we show it whole. Page ranking survives only as a fallback inside papers too long to fit, which no test-split paper was, and gold-page recall reaches 100% on the papers we can parse. Separately, questions that identify their target by position rather than content, such as “the first author of the 24th reference”, are served by parsing rather than retrieval: we resolve the bibliography into an addressable list, which also supplies identifiers the evidence metric scores. The final system scores 0.762 paper F₁, 0.441 evidence F₁ and 0.920 multiple-choice accuracy on the held-out test split. Because the pipeline depends on a closed model without seed control, we release a harness that verifies the paper's central claims against committed artifacts.</p>
  </details>
  <details class="cite-block">
    <summary>BibTeX</summary>
    <pre><code>@misc{chauhan2026pagerecall,
  author        = {Chauhan, Aaditya},
  title         = {PageRecall: Measuring Page Selection in Literature-Grounded
                   Question Answering},
  year          = {2026},
  eprint        = {2609.18154},
  archivePrefix = {arXiv},
  primaryClass  = {cs.IR}
}</code></pre>
  </details>
</div>

<div style="margin-bottom: 1.25rem;">
  <div style="display:flex; justify-content:space-between; align-items:baseline;">
    <h3 style="margin:0; font-size:1.1rem;"><a href="https://www.scitepress.org/Papers/2026/149121/149121.pdf" target="_blank" class="cactus-link">The Limits of Behavioral Pruning: Why Enterprise RAG Lifecycle Management Is a Governance Problem</a></h3>
    <span style="color:var(--color-text-offset); font-size:0.9rem; white-space:nowrap; margin-left:1rem;">2026</span>
  </div>
  <p class="paper-meta" style="margin-top:0.5rem; color:var(--color-global-text); opacity:0.75;">
    Aaditya Chauhan<br>
    ICEIS 2026, 28th Intl. Conference on Enterprise Information Systems, pp. 338–345 · <a href="https://doi.org/10.5220/0014912100004018" target="_blank" class="cactus-link">doi:10.5220/0014912100004018</a>
  </p>
  <details class="abstract-block">
    <summary>Abstract</summary>
    <p>Enterprise RAG systems accumulate embedding corpora that grow indefinitely, yet lack principled lifecycle management for their vector indexes. We propose behavioral pruning—using access patterns and semantic redundancy to select which documents to retain in the active index—centered on a governance mechanism we call semantic anchors: documents with no near-duplicates above a similarity threshold are preserved in the active index regardless of access frequency, and near-duplicate clusters retain their newest member, providing a traceable justification for retention decisions. We present an empirical evaluation identifying both conditions where the framework succeeds and where it fails. The recall advantage of behavioral pruning is conditional on corpus characteristics: random pruning achieves higher recall on historical queries (0.118 ± 0.011) than all structured methods; density-weighted behavioral pruning improves recall on fresh queries by 12% over semantic-only pruning. A supplementary simulation on BEIR benchmarks confirms behavioral signals help on redundant corpora with correlated access; on diverse corpora with uncorrelated access, recall degrades by up to 31%.</p>
  </details>
  <details class="cite-block">
    <summary>BibTeX</summary>
    <pre><code>@inproceedings{chauhan2026limits,
  author    = {Chauhan, Aaditya},
  title     = {The Limits of Behavioral Pruning: Why Enterprise RAG Lifecycle
               Management Is a Governance Problem},
  booktitle = {Proceedings of the 28th International Conference on Enterprise
               Information Systems (ICEIS 2026) - Volume 1},
  pages     = {338--345},
  year      = {2026},
  publisher = {SCITEPRESS},
  doi       = {10.5220/0014912100004018},
  isbn      = {978-989-758-834-1},
  issn      = {2184-4992}
}</code></pre>
  </details>
</div>

<div style="margin-bottom: 1.25rem;">
  <div style="display:flex; justify-content:space-between; align-items:baseline;">
    <h3 style="margin:0; font-size:1.1rem;"><a href="https://www.scitepress.org/Papers/2026/151504/151504.pdf" target="_blank" class="cactus-link">Chunking Is Not the Bottleneck: Why RAG Evaluation Must Look beyond Segmentation Strategy</a></h3>
    <span style="color:var(--color-text-offset); font-size:0.9rem; white-space:nowrap; margin-left:1rem;">2026</span>
  </div>
  <p class="paper-meta" style="margin-top:0.5rem; color:var(--color-global-text); opacity:0.75;">
    Aaditya Chauhan, Nivas Hegde<br>
    DATA 2026, 15th Intl. Conference on Data Science, Technology and Applications, pp. 605–612 · <a href="https://doi.org/10.5220/0015150400004091" target="_blank" class="cactus-link">doi:10.5220/0015150400004091</a>
  </p>
  <details class="abstract-block">
    <summary>Abstract</summary>
    <p>The RAG community devotes disproportionate attention to optimizing text chunking strategy. Through a factorial experiment crossing four chunking strategies, two embedding models, two chunk sizes, and two QA datasets (Natural Questions and MS-MARCO), we find that, in QA-style retrieval on two established datasets, choice of dataset (24–78% of variance) and embedding model (11–50%) together explain 67–89% of retrieval quality variance, while chunking strategy accounts for only 1–2% and is not statistically significant (p > 0.21). An end-to-end LLM-as-judge evaluation confirms that chunking differences do not propagate to generation quality in this QA setting (Kruskal-Wallis p > 0.88). We argue that, for QA-style retrieval on general-purpose natural-language corpora, chunking strategy is a low-variance factor, and that RAG benchmarks should report variance decomposition alongside absolute metrics so practitioners can allocate engineering effort to the factors that actually drive performance.</p>
  </details>
  <details class="cite-block">
    <summary>BibTeX</summary>
    <pre><code>@inproceedings{chauhan2026chunking,
  author    = {Chauhan, Aaditya and Hegde, Nivas},
  title     = {Chunking Is Not the Bottleneck: Why RAG Evaluation Must Look
               beyond Segmentation Strategy},
  booktitle = {Proceedings of the 15th International Conference on Data Science,
               Technology and Applications (DATA 2026) - Volume 1},
  pages     = {605--612},
  year      = {2026},
  publisher = {SCITEPRESS},
  doi       = {10.5220/0015150400004091},
  isbn      = {978-989-758-854-9},
  issn      = {2184-285X}
}</code></pre>
  </details>
</div>
