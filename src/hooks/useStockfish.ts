import { useEffect, useRef, useState, useCallback } from 'react';

export interface PositionAnalysis {
  fen: string;
  evaluation: number;
  mateIn: number | null;
  bestMove: string | null;
  depth: number;
  alternatives?: { move: string; evaluation: number; mateIn: number | null }[];
}

type AnalysisTask = {
  fen: string;
  depth: number;
  resolve: (result: PositionAnalysis) => void;
};

export const useStockfish = () => {
  const engineRef   = useRef<Worker | null>(null);
  const queueRef    = useRef<AnalysisTask[]>([]);
  const runningRef  = useRef<AnalysisTask | null>(null);
  const partialRef  = useRef<Partial<PositionAnalysis>>({ alternatives: [] });
  const bestMoveRef = useRef<string>('');
  const multiPVRef  = useRef<number>(3);

  const [isReady,       setIsReady]       = useState(false);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<PositionAnalysis | null>(null);
  const [bestMove,      setBestMove]      = useState<string>('');
  const [evaluation,    setEvaluation]    = useState<number>(0);
  const [mateIn,        setMateIn]        = useState<number | null>(null);

  const processQueue = useCallback(() => {
    if (runningRef.current || queueRef.current.length === 0 || !engineRef.current) return;
    const task = queueRef.current.shift()!;
    runningRef.current = task;
    partialRef.current = { fen: task.fen, bestMove: null, evaluation: 0, mateIn: null, depth: 0, alternatives: [] };
    setIsAnalyzing(true);
    engineRef.current.postMessage('stop');
    engineRef.current.postMessage(`position fen ${task.fen}`);
    engineRef.current.postMessage(`go depth ${task.depth}`);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initEngine = async () => {
      try {
        const engine = new Worker('/stockfish.js');
        engineRef.current = engine;

        engine.onmessage = (event) => {
          if (!mounted) return;
          const msg: string = event.data;

          if (msg === 'uciok' || msg === 'readyok') {
            setIsReady(true);
            return;
          }

          // ── bestmove: analysis complete ──
          if (msg.startsWith('bestmove')) {
            const m = msg.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
            const bm = m ? m[1] : null;
            bestMoveRef.current = bm ?? '';
            setBestMove(bm ?? '');

            const task = runningRef.current;
            if (task) {
              const result: PositionAnalysis = {
                fen:        task.fen,
                evaluation: partialRef.current.evaluation ?? 0,
                mateIn:     partialRef.current.mateIn     ?? null,
                bestMove:   bm,
                depth:      partialRef.current.depth      ?? 0,
                alternatives: partialRef.current.alternatives ?? [],
              };
              setCurrentAnalysis(result);
              setEvaluation(result.evaluation);
              setMateIn(result.mateIn);
              task.resolve(result);
              runningRef.current = null;
            }
            setIsAnalyzing(false);
            processQueue();
            return;
          }

          // ── info depth: incremental update with MultiPV ──
          if (msg.includes('info') && msg.includes('depth')) {
            const depthM = msg.match(/depth (\d+)/);
            const depth  = depthM ? parseInt(depthM[1]) : 0;
            if (depth < 3) return;

            const multiPvM = msg.match(/multipv (\d+)/);
            const pvIndex = multiPvM ? parseInt(multiPvM[1]) - 1 : 0;

            let evalScore = 0; // Default if not parsed this line
            let mate: number | null = null;

            if (msg.includes('score mate')) {
              const mm = msg.match(/score mate (-?\d+)/);
              if (mm) {
                mate = parseInt(mm[1]);
                evalScore = mate > 0 ? 10 : -10;
              }
            } else if (msg.includes('score cp')) {
              const cm = msg.match(/score cp (-?\d+)/);
              if (cm) evalScore = parseInt(cm[1]) / 100;
            }

            const pvMatch = msg.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
            const pvMove = pvMatch ? pvMatch[1] : '';

            // Update alternatives array
            const currentAlts = partialRef.current.alternatives ? [...partialRef.current.alternatives] : [];
            currentAlts[pvIndex] = { move: pvMove, evaluation: evalScore, mateIn: mate };

            partialRef.current = { ...partialRef.current, depth, alternatives: currentAlts };

            // Live UI update (only trigger state updates on the primary line to avoid thrashing)
            if (pvIndex === 0) {
              partialRef.current.evaluation = evalScore;
              partialRef.current.mateIn = mate;

              if (depth >= 8) {
                setEvaluation(evalScore);
                setMateIn(mate);
                setCurrentAnalysis(prev => prev
                  ? { ...prev, evaluation: evalScore, mateIn: mate, depth, alternatives: currentAlts }
                  : { fen: runningRef.current?.fen ?? '', evaluation: evalScore, mateIn: mate, bestMove: null, depth, alternatives: currentAlts }
                );
              }
            }
          }
        };

        engine.onerror = () => setIsReady(false);
        engine.postMessage('uci');
        // Enable MultiPV to evaluate the top 3 moves (default)
        engine.postMessage(`setoption name MultiPV value ${multiPVRef.current}`);
        setTimeout(() => { if (mounted && engineRef.current) engine.postMessage('isready'); }, 800);
      } catch {
        setIsReady(false);
      }
    };

    initEngine();
    return () => {
      mounted = false;
      engineRef.current?.terminate();
    };
  }, [processQueue]);

  const analyzePositionAsync = useCallback((fen: string, depth = 12): Promise<PositionAnalysis> => {
    return new Promise((resolve) => {
      queueRef.current.push({ fen, depth, resolve });
      processQueue();
    });
  }, [processQueue]);

  const analyzePosition = useCallback((fen: string, depth = 10) => {
    analyzePositionAsync(fen, depth).catch(() => {});
  }, [analyzePositionAsync]);

  const getBestMove = useCallback((fen: string, depth = 8) => {
    analyzePositionAsync(fen, depth).catch(() => {});
  }, [analyzePositionAsync]);

  const resetAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
    setBestMove('');
    setEvaluation(0);
    setMateIn(null);
    setIsAnalyzing(false);
    // Clear any running analysis
    if (engineRef.current) {
      engineRef.current.postMessage('stop');
    }
    // Clear queue and running task
    queueRef.current = [];
    runningRef.current = null;
    partialRef.current = { alternatives: [] };
    bestMoveRef.current = '';
  }, []);

  const setMultiPVLines = useCallback((lines: number) => {
    multiPVRef.current = lines;
    if (engineRef.current && isReady) {
      engineRef.current.postMessage(`setoption name MultiPV value ${lines}`);
    }
  }, [isReady]);

  return {
    isReady,
    isAnalyzing,
    currentAnalysis,
    bestMove,
    evaluation,
    mateIn,
    analyzePosition,
    analyzePositionAsync,
    getBestMove,
    getPositionAnalysis: () => currentAnalysis,
    clearCache: () => {},
    resetAnalysis,
    setMultiPVLines,
  };
};