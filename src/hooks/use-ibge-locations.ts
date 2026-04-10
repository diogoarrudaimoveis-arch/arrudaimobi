import { useQuery } from "@tanstack/react-query";

interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECity {
  id: number;
  nome: string;
}

export function useIBGEStates() {
  return useQuery<IBGEState[]>({
    queryKey: ["ibge-states"],
    queryFn: async () => {
      const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
      if (!res.ok) throw new Error("Erro ao buscar estados");
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useIBGECities(uf: string) {
  return useQuery<IBGECity[]>({
    queryKey: ["ibge-cities", uf],
    queryFn: async () => {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      if (!res.ok) throw new Error("Erro ao buscar cidades");
      return res.json();
    },
    enabled: !!uf && uf.length === 2,
    staleTime: Infinity,
  });
}
