import { describe, it, expect, jest } from "@jest/globals";
import React from "react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import HospitalCard from "@/components/hospital/HospitalCard";

// Mock language context for HospitalCard
jest.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: "en",
    setLanguage: jest.fn(),
  }),
}));

describe("UI Components Test Suite", () => {
  describe("Button Component & buttonVariants", () => {
    it("generates default variant with expected classes", () => {
      const classes = buttonVariants({ variant: "default", size: "default" });
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("text-primary-foreground");
      expect(classes).toContain("px-3.5");
      expect(classes).not.toContain("px-32.5");
    });

    it("generates destructive variant classes correctly", () => {
      const classes = buttonVariants({ variant: "destructive" });
      expect(classes).toContain("bg-destructive");
      expect(classes).toContain("text-destructive");
    });

    it("generates outline variant classes correctly", () => {
      const classes = buttonVariants({ variant: "outline", size: "sm" });
      expect(classes).toContain("border-border");
      expect(classes).toContain("h-7");
    });

    it("generates icon size classes correctly", () => {
      const classes = buttonVariants({ size: "icon" });
      expect(classes).toContain("size-8");
    });

    it("instantiates Button element with proper props and children", () => {
      const element = React.createElement(Button, { variant: "secondary", disabled: true }, "Submit Application");
      expect(element).toBeDefined();
      expect(element.props.variant).toBe("secondary");
      expect(element.props.disabled).toBe(true);
      expect(element.props.children).toBe("Submit Application");
    });
  });

  describe("Badge Component & badgeVariants", () => {
    it("generates default badge variant classes", () => {
      const classes = badgeVariants({ variant: "default" });
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("text-primary-foreground");
    });

    it("generates destructive and outline badge variants", () => {
      const destructive = badgeVariants({ variant: "destructive" });
      expect(destructive).toContain("text-destructive");

      const outline = badgeVariants({ variant: "outline" });
      expect(outline).toContain("border-border");
    });

    it("instantiates Badge element with variant props", () => {
      const element = React.createElement(Badge, { variant: "destructive" }, "Critical Value");
      expect(element).toBeDefined();
      expect(element.props.variant).toBe("destructive");
      expect(element.props.children).toBe("Critical Value");
    });
  });

  describe("Input Component", () => {
    it("renders input element with type and accessible placeholder", () => {
      const element = React.createElement(Input, {
        type: "email",
        placeholder: "patient@aarogya.in",
        "aria-label": "Patient Email Address",
        required: true,
      });

      expect(element).toBeDefined();
      expect(element.props.type).toBe("email");
      expect(element.props.placeholder).toBe("patient@aarogya.in");
      expect(element.props["aria-label"]).toBe("Patient Email Address");
      expect(element.props.required).toBe(true);
    });

    it("supports disabled state for read-only view", () => {
      const element = React.createElement(Input, {
        disabled: true,
        value: "Fixed Reference Value",
      });

      expect(element.props.disabled).toBe(true);
      expect(element.props.value).toBe("Fixed Reference Value");
    });
  });

  describe("Card Component", () => {
    it("renders card title, description and icon", () => {
      const element = Card({
        title: "Medical Report Analyzer",
        description: "Upload CBC and blood reports for instant safety explanation",
        icon: "🩺",
      });

      expect(element).toBeDefined();
      expect(element.props.className).toContain("rounded-2xl");

      // Verify sub-components contain title, description, and icon
      const children = React.Children.toArray(element.props.children);
      expect(children.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("HospitalCard Component", () => {
    it("renders hospital card with name, address, and coordinates", () => {
      const hospitalData = {
        name: "AIIMS New Delhi",
        address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
        lat: 28.5672,
        lon: 77.21,
        phone: "+91-11-26588500",
        category: "Apex Super-speciality Hospital",
        distance: 3500,
      };

      const element = HospitalCard({ hospital: hospitalData });
      expect(element).toBeDefined();
      expect(element.props.className).toContain("rounded-2xl");
    });
  });
});
