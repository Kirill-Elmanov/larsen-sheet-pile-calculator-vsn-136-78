/**
 * Larsen Sheet Pile Design Calculator
 * Core calculation module for embedment depth determination
 * Based on VSN 136-78 (Russian design code for temporary retaining structures)
 * 
 * Author: Kirill Elmanov
 * https://github.com/[your-username]/larsen-sheet-pile-calculator-vsn-136-78
 */

/**
 * Automatic calculation of required embedment depth
 * Iteratively determines the minimum depth needed to achieve target safety factor
 * 
 * @param {Object} params - Calculation parameters
 * @param {number} params.Ea - Active earth pressure resultant (kN/m)
 * @param {number} params.gamma - Soil unit weight (kN/m³)
 * @param {number} params.Kp - Passive earth pressure coefficient
 * @param {number} params.cohesionPassive - Passive cohesion term (kPa)
 * @param {string} params.waterLevel - Water level condition ('below' or 'surface')
 * @param {number} params.targetSafety - Required safety factor (default: 1.2 per VSN 136-78)
 * @param {number} params.startDepth - Initial guess for embedment depth (m)
 * 
 * @returns {Object} Result object containing:
 *   - minDepth: Minimum embedment depth (m)
 *   - recommendedDepth: Recommended depth with 10% margin (m)
 *   - achievedSafety: Actual safety factor achieved
 *   - iterations: Number of iterations performed
 *   - success: Boolean indicating calculation success
 */
function autoCalculateEmbedmentDepth(params) {
    const {
        Ea,
        gamma,
        Kp,
        cohesionPassive,
        waterLevel,
        targetSafety = 1.2,
        startDepth = 1.0
    } = params;

    // Adjust unit weight for submerged conditions
    const gammaW = 9.8; // Water unit weight (kN/m³)
    const gammaPrime = (waterLevel === 'below') ? gamma : (gamma - gammaW);

    // Iteration parameters
    let t = startDepth;
    const step = 0.1; // Depth increment (m)
    const maxIterations = 200;
    let iterations = 0;

    // Iterative search for embedment depth
    while (iterations < maxIterations) {
        // Calculate passive pressure distribution
        const pressureTop = cohesionPassive;
        const pressureBottom = gammaPrime * t * Kp + cohesionPassive;
        
        // Calculate passive resistance resultant (trapezoidal distribution)
        const Ep = 0.5 * (pressureTop + pressureBottom) * t;
        
        // Check safety factor
        const safety = Ep / Ea;
        
        if (safety >= targetSafety) {
            break;
        }
        
        t += step;
        iterations++;
    }

    // Check for convergence failure
    if (iterations >= maxIterations) {
        return {
            success: false,
            message: 'Convergence failure: maximum iterations exceeded'
        };
    }

    // Calculate final values
    const minDepth = t;
    const recommendedDepth = t * 1.1; // Add 10% margin
    
    const pressureTop = cohesionPassive;
    const pressureBottom = gammaPrime * minDepth * Kp + cohesionPassive;
    const Ep = 0.5 * (pressureTop + pressureBottom) * minDepth;
    const achievedSafety = Ep / Ea;

    return {
        success: true,
        minDepth: minDepth,
        recommendedDepth: recommendedDepth,
        achievedSafety: achievedSafety,
        iterations: iterations
    };
}

/**
 * Verification of manually specified embedment depth
 * Checks if given depth provides adequate safety factor
 * 
 * @param {Object} params - Calculation parameters
 * @param {number} params.t - Specified embedment depth (m)
 * @param {number} params.Ea - Active earth pressure resultant (kN/m)
 * @param {number} params.gamma - Soil unit weight (kN/m³)
 * @param {number} params.Kp - Passive earth pressure coefficient
 * @param {number} params.cohesionPassive - Passive cohesion term (kPa)
 * @param {string} params.waterLevel - Water level condition
 * 
 * @returns {Object} Verification result:
 *   - Ep: Passive resistance resultant (kN/m)
 *   - safety: Achieved safety factor
 *   - adequate: Boolean indicating if safety factor >= 1.2
 */
function verifyManualDepth(params) {
    const {
        t,
        Ea,
        gamma,
        Kp,
        cohesionPassive,
        waterLevel
    } = params;

    // Adjust unit weight for submerged conditions
    const gammaW = 9.8;
    const gammaPrime = (waterLevel === 'below') ? gamma : (gamma - gammaW);

    // Calculate passive pressure distribution
    const pressureTop = cohesionPassive;
    const pressureBottom = gammaPrime * t * Kp + cohesionPassive;
    
    // Calculate passive resistance resultant
    const Ep = 0.5 * (pressureTop + pressureBottom) * t;
    
    // Calculate safety factor
    const safety = Ep / Ea;

    return {
        Ep: Ep,
        safety: safety,
        adequate: safety >= 1.2,
        message: safety >= 1.2 
            ? `Adequate: Safety factor ${safety.toFixed(2)} ≥ 1.2`
            : `Inadequate: Safety factor ${safety.toFixed(2)} < 1.2. Increase embedment depth.`
    };
}

/**
 * Calculate earth pressure coefficients
 * Based on Rankine theory (VSN 136-78, clause 4.6)
 * 
 * @param {number} phi - Internal friction angle (degrees)
 * @param {number} cohesion - Soil cohesion (kPa)
 * 
 * @returns {Object} Coefficients:
 *   - Ka: Active earth pressure coefficient
 *   - Kp: Passive earth pressure coefficient
 *   - cohesionActive: Active cohesion term
 *   - cohesionPassive: Passive cohesion term
 */
function calculatePressureCoefficients(phi, cohesion) {
    const phiRad = phi * Math.PI / 180;
    
    // Rankine coefficients
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    const Kp = Math.tan(Math.PI / 4 + phiRad / 2) ** 2;
    
    // Cohesion terms (VSN 136-78, clause 4.7)
    const cohesionActive = -2 * cohesion * Math.sqrt(Ka);
    const cohesionPassive = 2 * cohesion * Math.sqrt(Kp);

    return {
        Ka: Ka,
        Kp: Kp,
        KaSqrt: Math.sqrt(Ka),
        KpSqrt: Math.sqrt(Kp),
        cohesionActive: cohesionActive,
        cohesionPassive: cohesionPassive
    };
}

/**
 * Example usage
 */
function exampleCalculation() {
    // Input parameters
    const soilParams = {
        gamma: 21.0,        // Soil unit weight (kN/m³)
        phi: 25.0,          // Internal friction angle (degrees)
        cohesion: 40.0,     // Cohesion (kPa)
        waterLevel: 'below' // Water level below excavation
    };
    
    const excavation = {
        depth: 6.0,         // Excavation depth (m)
        surfaceLoad: 10.0   // Surface surcharge (kPa)
    };

    // Step 1: Calculate pressure coefficients
    const coefficients = calculatePressureCoefficients(
        soilParams.phi,
        soilParams.cohesion
    );

    console.log('Pressure Coefficients:');
    console.log(`Ka = ${coefficients.Ka.toFixed(3)}`);
    console.log(`Kp = ${coefficients.Kp.toFixed(2)}`);

    // Step 2: Calculate active earth pressure (simplified)
    const pressureAtBottom = soilParams.gamma * excavation.depth * coefficients.Ka 
                           + coefficients.cohesionActive 
                           + excavation.surfaceLoad * coefficients.Ka;
    const Ea = 0.5 * pressureAtBottom * excavation.depth;

    console.log(`\nActive pressure resultant Ea = ${Ea.toFixed(1)} kN/m`);

    // Step 3: Automatic embedment depth calculation
    const result = autoCalculateEmbedmentDepth({
        Ea: Ea,
        gamma: soilParams.gamma,
        Kp: coefficients.Kp,
        cohesionPassive: coefficients.cohesionPassive,
        waterLevel: soilParams.waterLevel,
        targetSafety: 1.2,
        startDepth: 1.0
    });

    if (result.success) {
        console.log('\nEmbedment Depth Calculation:');
        console.log(`Minimum depth: ${result.minDepth.toFixed(2)} m`);
        console.log(`Recommended depth (+10%): ${result.recommendedDepth.toFixed(2)} m`);
        console.log(`Achieved safety factor: ${result.achievedSafety.toFixed(2)}`);
        console.log(`Iterations: ${result.iterations}`);
    } else {
        console.error(`Calculation failed: ${result.message}`);
    }

    // Step 4: Verify a manual depth
    const verification = verifyManualDepth({
        t: 3.5,
        Ea: Ea,
        gamma: soilParams.gamma,
        Kp: coefficients.Kp,
        cohesionPassive: coefficients.cohesionPassive,
        waterLevel: soilParams.waterLevel
    });

    console.log('\nManual Depth Verification (t = 3.5 m):');
    console.log(`Passive resistance Ep = ${verification.Ep.toFixed(1)} kN/m`);
    console.log(`Safety factor = ${verification.safety.toFixed(2)}`);
    console.log(verification.message);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        autoCalculateEmbedmentDepth,
        verifyManualDepth,
        calculatePressureCoefficients
    };
}
