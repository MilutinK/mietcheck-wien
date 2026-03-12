interface Props {
    showCompare: boolean;
    onStartCompare: () => void;
    onExitCompare: () => void;
}

export default function CompareBar({
    showCompare,
    onStartCompare,
    onExitCompare,
}: Props) {
    return (
        <div className="compare-bar">
            {showCompare ? (
                <button className="btn btn-secondary" onClick={onExitCompare}>
                    ✕ Vergleich beenden
                </button>
            ) : (
                <button className="btn btn-primary" onClick={onStartCompare}>
                    ⇄ Bezirke vergleichen
                </button>
            )}
        </div>
    );
}