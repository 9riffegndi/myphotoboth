'use client';
import { useState, useCallback, useMemo, useEffect, startTransition, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FlipCardStack({
  children,
  cardWidth = "100%",
  cardHeight = "100%",
  stackOffsetX = 35,
  stackOffsetY = 25,
  stackRotation = 7,
  dragThreshold = 50,
  onTopCardChange,
}: {
  children: ReactNode[];
  cardWidth?: number | string;
  cardHeight?: number | string;
  stackOffsetX?: number;
  stackOffsetY?: number;
  stackRotation?: number;
  dragThreshold?: number;
  onTopCardChange?: (index: number) => void;
}) {
  const [cardOrder, setCardOrder] = useState<number[]>(() => children ? (Array.isArray(children) ? children : [children]).map((_, i) => i) : []);

  useEffect(() => {
    const arr = children ? (Array.isArray(children) ? children : [children]) : [];
    setCardOrder(arr.map((_, i) => i));
  }, [children]);

  const getCardTransform = useCallback((cardIndex: number) => {
    const stackPosition = cardOrder.indexOf(cardIndex);
    const positionFromBottom = cardOrder.length - 1 - stackPosition;
    
    // Zigzag logic: ganti arah tiap layer
    const isOdd = positionFromBottom % 2 !== 0;
    const direction = isOdd ? 1 : -1;
    
    let xOffset = 0;
    let rotateVal = 0;
    if (positionFromBottom > 0) {
      xOffset = direction * (stackOffsetX + positionFromBottom * 8);
      rotateVal = direction * (stackRotation + positionFromBottom * 2);
    }

    return {
      zIndex: stackPosition,
      x: xOffset,
      y: positionFromBottom * stackOffsetY,
      rotate: rotateVal,
      scale: 1 - positionFromBottom * 0.02,
      opacity: 1
    };
  }, [cardOrder, stackOffsetX, stackOffsetY, stackRotation]);

  const handleDragEnd = useCallback((event: any, info: any, cardIndex: number) => {
    const dragDistance = Math.abs(info.offset.x) + Math.abs(info.offset.y);
    const velocity = Math.abs(info.velocity.x) + Math.abs(info.velocity.y);
    
    // Jika digeser cukup jauh
    if (dragDistance > dragThreshold || velocity > 600) {
      const newOrder = [...cardOrder];
      const draggedPos = newOrder.indexOf(cardIndex);
      const draggedCard = newOrder.splice(draggedPos, 1)[0];
      newOrder.unshift(draggedCard); // Taruh elemen teratas ke paling bawah tumpukan

      const topCardIndex = newOrder[newOrder.length - 1];

      startTransition(() => {
        setCardOrder(newOrder);
      });

      if (onTopCardChange) {
        onTopCardChange(topCardIndex);
      }
    }
  }, [cardOrder, dragThreshold, onTopCardChange]);

  const cardVariants = {
    initial: (custom: any) => ({ ...custom, x: custom.x || 0, y: custom.y || 0 }),
    animate: (custom: any) => ({
      ...custom,
      transition: { type: "spring", damping: 25, stiffness: 400, mass: 0.6, restDelta: 0.01, restSpeed: 0.01 }
    }),
    drag: { scale: 1.05, rotate: 0, transition: { duration: 0.05 } }
  };

  const renderedCards = useMemo(() => {
    const arr = children ? (Array.isArray(children) ? children : [children]) : [];
    return arr.map((child, index) => {
      const transform = getCardTransform(index);
      const isTopCard = cardOrder.indexOf(index) === cardOrder.length - 1;
      
      return (
        <motion.div
          key={`card-${index}`}
          custom={transform}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          whileDrag="drag"
          drag={isTopCard}
          dragConstraints={{ top: -250, bottom: 250, left: -250, right: 250 }}
          dragElastic={0.4}
          dragSnapToOrigin={true}
          onDragEnd={(e, info) => handleDragEnd(e, info, index)}
          style={{
            position: "absolute",
            width: cardWidth,
            height: cardHeight,
            cursor: isTopCard && arr.length > 1 ? "grab" : "default",
            borderRadius: 16,
            overflow: "hidden"
          }}
          whileHover={isTopCard && arr.length > 1 ? { scale: 1.02 } : {}}
          whileTap={isTopCard && arr.length > 1 ? { cursor: "grabbing" } : {}}
        >
          {child}
        </motion.div>
      );
    });
  }, [children, cardOrder, cardWidth, cardHeight, getCardTransform, cardVariants, handleDragEnd]);

  const arr = children ? (Array.isArray(children) ? children : [children]) : [];

  return (
    <div style={{ position: "relative", width: cardWidth, height: cardHeight, perspective: "1000px" }}>
      <AnimatePresence>
        {renderedCards}
      </AnimatePresence>
      {arr.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#eee', borderRadius: 16 }}>
          <span style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>Tidak ada foto</span>
        </div>
      )}
    </div>
  );
}
